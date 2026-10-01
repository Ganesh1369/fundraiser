const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const contact = require('../controllers/contact.controller');

// The CV travels as an email attachment and is never stored, so it is kept in memory
// rather than written to the uploads folder. The form allows a PDF of up to 2 MB.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(Object.assign(new Error('CV must be a PDF.'), { status: 400, field: 'cv' }));
        }
        cb(null, true);
    }
});

/** Turn multer's errors into the same field-level JSON shape the form already handles. */
const handleUpload = (req, res, next) => {
    upload.fields([{ name: 'cv', maxCount: 1 }])(req, res, (err) => {
        if (!err) return next();

        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large (2 MB maximum).'
            : err.message || 'Upload failed.';

        res.status(err.status || 400).json({
            success: false,
            message,
            errors: { cv: message },
        });
    });
};

// Each call sends mail, so this is tighter than the global API limiter.
const submitLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many messages from this network. Please try again in an hour, or email us directly.'
    }
});

// Public — the "Break the ICE, say hi!" form on the ICE home page.
router.post('/contact', submitLimiter, handleUpload, contact.create);

module.exports = router;
