const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const os = require('os');
const { User, PrintJob, sequelize } = require('../models');

// Admin Registration
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    console.log('Request body:', req.body);
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({ name, email, password });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });

    return res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.validPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );

    // Set the HTTP-only cookie for browser route protection
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in production (HTTPS)
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000 // 12 hours (matches JWT expiration)
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Queue / Handled Jobs with search and filters
exports.getJobs = async (req, res) => {
  try {
    const { status = 'unhandled', search = '', startDate, endDate } = req.query;

    const whereClause = { status };

    if (search) {
      whereClause[Op.or] = [
        { referenceNumber: { [Op.iLike]: `%${search}%` } },
        { originalFileName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59`)]
      };
    }

    const jobs = await PrintJob.findAll({
      where: whereClause,
      include: [{ model: User, as: 'handler', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', status === 'unhandled' ? 'ASC' : 'DESC']]
    });

    return res.json({ success: true, data: jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update status (unhandled -> handled)
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const job = await PrintJob.findByPk(id);
    if (!job) return res.status(404).json({ success: false, message: 'Print job not found.' });

    job.status = status;
    job.handledAt = status === 'handled' ? new Date() : null;
    job.handledByUserId = status === 'handled' ? req.admin.id : null;
    await job.save();

    return res.json({ success: true, message: `Job marked as ${status}`, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Download File
exports.downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await PrintJob.findByPk(id);
    if (!job || !fs.existsSync(job.filePath)) {
      return res.status(404).json({ success: false, message: 'File requested does not exist on server.' });
    }
    return res.download(job.filePath, job.originalFileName);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Preview File
exports.previewFile = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await PrintJob.findByPk(id);
    if (!job || !fs.existsSync(job.filePath)) {
      return res.status(404).send('File not found');
    }
    return res.sendFile(path.resolve(job.filePath));
  } catch (error) {
    return res.status(500).send('Error serving file preview');
  }
};

// System Analytics
exports.getAnalytics = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totals] = await sequelize.query(`
      SELECT 
        COUNT(*) FILTER (WHERE "createdAt"::date = '${today}') AS "todayDocs",
        COUNT(*) AS "allTimeDocs",
        COUNT(*) FILTER (WHERE status = 'unhandled') AS "unhandledDocs",
        COUNT(*) FILTER (WHERE status = 'handled') AS "handledDocs",
        COALESCE(SUM("pageCount") FILTER (WHERE status = 'unhandled'), 0) AS "unhandledPages",
        COALESCE(SUM("pageCount") FILTER (WHERE status = 'handled'), 0) AS "handledPages",
        COALESCE(SUM("pageCount"), 0) AS "totalPages"
      FROM print_jobs;
    `);

    const [typeBreakdown] = await sequelize.query(`
      SELECT "fileType", SUM("pageCount") as "pages", COUNT(*) as "count"
      FROM print_jobs
      GROUP BY "fileType";
    `);

    const [dailyVolume] = await sequelize.query(`
      SELECT "createdAt"::date as "date", COUNT(*) as "jobs", SUM("pageCount") as "pages"
      FROM print_jobs
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY "createdAt"::date
      ORDER BY "date" ASC;
    `);

    return res.json({
      success: true,
      data: {
        summary: totals[0],
        typeBreakdown,
        dailyVolume
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIpaddress = async (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIp = iface.address;
          break;
        }
      }
    }

    return res.json({ ip: localIp });
  } catch (error) {
    return res.status(500).send('Error getting ip address');
  }
}