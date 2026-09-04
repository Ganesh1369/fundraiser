const express = require('express');
const router = express.Router();
const pageContentController = require('../controllers/page-content.controller');

// Public Routes — CSR Collaboration page
router.get('/csr/page', pageContentController.getCsrPage);

module.exports = router;
