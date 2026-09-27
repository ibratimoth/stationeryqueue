const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Flexible Middleware: Handles cookie auth for web pages & Bearer tokens for APIs
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization header (for direct API calls)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } 
    // 2. Check HTTP-only cookie (for browser page requests like /admin)
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // Helper to handle authentication failure based on request type
    const handleUnauthorized = (message = 'Unauthorized access') => {
      // If the request expects HTML (browser navigating to /admin), redirect
      if (req.accepts('html')) {
        res.clearCookie('token');
        return res.redirect('/login');
      }
      // If it's an API request, return JSON
      return res.status(401).json({
        success: false,
        message
      });
    };

    if (!token) {
      return handleUnauthorized('Access denied. No authentication token provided.');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database
    const admin = await User.findByPk(decoded.id);

    if (!admin) {
      return handleUnauthorized('Invalid token. User no longer exists.');
    }

    // Attach admin info to request
    req.admin = admin;
    next();

  } catch (error) {
    if (req.accepts('html')) {
      res.clearCookie('token');
      return res.redirect('/login');
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.'
    });
  }
};

module.exports = { authenticateAdmin };