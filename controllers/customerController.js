const path = require('path');
const { PrintJob } = require('../models');
const { generateReferenceNumber } = require('../services/serialService');
const { calculatePageCount } = require('../services/documentService');

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
    }

    const { printOption, customPageCount } = req.body;
    const rawExt = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const referenceNumber = await generateReferenceNumber();
    
    // 1. Detect actual total page count from file
    const detectedPageCount = await calculatePageCount(req.file.path, rawExt);

    // 2. Determine final pageCount based on user selection
    let finalPageCount = detectedPageCount;

    if (printOption === 'custom' && customPageCount) {
      const parsedCustomPages = parseInt(customPageCount, 10);
      if (!isNaN(parsedCustomPages) && parsedCustomPages > 0) {
        finalPageCount = parsedCustomPages;
      }
    }

    // 3. Save to database
    const printJob = await PrintJob.create({
      referenceNumber,
      originalFileName: req.file.originalname,
      storedFileName: req.file.filename,
      filePath: req.file.path,
      fileType: rawExt,
      fileSize: req.file.size,
      pageCount: finalPageCount,
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