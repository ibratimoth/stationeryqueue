const path = require('path');
const { PrintJob } = require('../models');
const { generateReferenceNumber } = require('../services/serialService');
const { calculatePageCount } = require('../services/documentService');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
    }

    const rawExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const referenceNumber = await generateReferenceNumber();
    const detectedPageCount = await calculatePageCount(req.file.path, rawExt);

    const printJob = await PrintJob.create({
      referenceNumber,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      fileType: rawExt,
      fileSize: req.file.size,
      pageCount: detectedPageCount,
      status: 'unhandled'
    });

    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: {
        referenceNumber: printJob.referenceNumber,
        originalFileName: printJob.originalFileName,
        fileType: printJob.fileType,
        pageCount: printJob.pageCount,
        createdAt: printJob.createdAt
      }
    });
  } catch (error) {
    console.error('Upload Controller Error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};