const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');

// Public Authentication Endpoints
router.post('/register', adminController.register);
router.post('/login', adminController.login);

// Protected Admin Endpoints
router.get('/jobs', authenticateAdmin, adminController.getJobs);
router.patch('/jobs/:id/status', authenticateAdmin, adminController.updateStatus);
router.get('/jobs/:id/download', authenticateAdmin, adminController.downloadFile);
router.get('/jobs/:id/preview', authenticateAdmin, adminController.previewFile);
router.get('/analytics', authenticateAdmin, adminController.getAnalytics);
router.get('/server-ip', authenticateAdmin, adminController.getIpaddress);

module.exports = router;