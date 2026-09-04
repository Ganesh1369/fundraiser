const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const csrEnquiry = require('../controllers/csr-enquiry.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

/**
 * Route names are deliberately `csr-enquiries`, not `csr/...`: `main` carries an
 * unrelated CSR module whose `/admin/csr/:id` route would otherwise swallow these.
 */

// Submission limiter — a legitimate company sends one enquiry, not five an hour.
// Tighter than the global 200/min API limiter because this endpoint writes a row and
// sends mail on every call.
const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many enquiries from this network. Please try again in an hour, or email us directly.'
    }
});

// Public
router.post('/csr-enquiries', submitLimiter, csrEnquiry.create);

// Admin — editable ICE-branded email templates
router.get('/admin/csr-enquiries/templates', verifyAdmin, csrEnquiry.adminListTemplates);
router.put('/admin/csr-enquiries/templates/:key', verifyAdmin, csrEnquiry.adminUpdateTemplate);

module.exports = router;
