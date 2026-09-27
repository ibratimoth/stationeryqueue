const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const customerController = require('../controllers/customerController');

// Public file upload route
router.post('/upload', upload.single('document'), customerController.uploadDocument);

module.exports = router;