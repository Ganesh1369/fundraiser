const express = require('express');
const router = express.Router();
const csrPageController = require('../controllers/csr-page.controller');

// Public Routes — CSR Collaboration page
router.get('/csr/page', csrPageController.getPage);

module.exports = router;
