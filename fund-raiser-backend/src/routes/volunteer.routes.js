const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const volunteer = require('../controllers/volunteer.controller');

const uploadDir = path.join(__dirname, '../../uploads/volunteers');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        // Timestamped + randomised so two uploads of "aadhaar.jpg" cannot overwrite each other.
        const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
        cb(null, `vol-${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

// Photo is an image; ID proof may also be a scanned PDF.
const PHOTO_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ID_PROOF_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 2 },
    fileFilter: (req, file, cb) => {
        const allowed = file.fieldname === 'photo' ? PHOTO_MIME : ID_PROOF_MIME;
        if (!allowed.has(file.mimetype)) {
            const label = file.fieldname === 'photo' ? 'Photo must be a JPG, PNG or WebP image.'
                                                     : 'ID proof must be a JPG, PNG, WebP or PDF.';
            return cb(Object.assign(new Error(label), { status: 400, field: file.fieldname }));
        }
        cb(null, true);
    }
});

/** Turn multer's errors into the same field-level JSON shape the form already handles. */
const handleUpload = (req, res, next) => {
    upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idProof', maxCount: 1 }])(req, res, (err) => {
        if (!err) return next();

        const field = err.field === 'idProof' ? 'idProof' : 'photo';
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large (5 MB maximum).'
            : err.message || 'Upload failed.';

        res.status(err.status || 400).json({
            success: false,
            message,
            errors: { [field]: message },
        });
    });
};

// One person registers once, so this is deliberately tighter than the CSR enquiry limit.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many registration attempts from this network. Please try again in an hour.'
    }
});

// Public Routes
router.post('/volunteers', registerLimiter, handleUpload, volunteer.register);

module.exports = router;
