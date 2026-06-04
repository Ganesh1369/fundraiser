const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/user.controller');
const { verifyToken, canRequestTaxCertificate } = require('../middleware/auth.middleware');

// Profile pic upload config — saves to frontend public dir
const uploadDir = path.join(__dirname, '../../../fund-raiser-frontend/public/uploads/profile');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${req.user.id}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
});

// Corporate logo upload — timestamped filenames so historical receipts
// (which embed the bytes at generation time) are unaffected by re-uploads.
const corpLogoDir = path.join(__dirname, '../../../fund-raiser-frontend/public/uploads/corp');
if (!fs.existsSync(corpLogoDir)) fs.mkdirSync(corpLogoDir, { recursive: true });

const corpLogoUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, corpLogoDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `corp-${req.user.id}-${Date.now()}${ext}`);
        }
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, WebP, and SVG images are allowed'));
    }
});

// All routes require authentication
router.use(verifyToken);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.put('/profile', userController.updateProfile);

// Upload profile picture
router.put('/profile/avatar', upload.single('avatar'), userController.uploadAvatar);

// Remove profile picture
router.delete('/profile/avatar', userController.removeAvatar);

// Corporate logo upload — organization users only (service-level guard)
router.put('/profile/corporate-logo', corpLogoUpload.single('logo'), userController.uploadCorporateLogo);
router.delete('/profile/corporate-logo', userController.removeCorporateLogo);

// Get user donations with filters
router.get('/donations', userController.getDonations);

// Get donation summary
router.get('/donations/summary', userController.getDonationSummary);

// CSR rollup for organization users (returns null for non-org)
router.get('/csr-summary', userController.getCsrSummary);

// FY-end CSR rollup xlsx download (organization users only)
router.get('/csr-rollup', userController.exportCsrRollup);

// Active CSR commitments + tranche schedule (organization users only)
router.get('/csr-commitments', userController.getCsrCommitments);

// Get referral statistics
router.get('/referrals', userController.getReferrals);

// Get referral points history
router.get('/referrals/history', userController.getReferralPointsHistory);

// Request 80G certificate (organization only)
router.post('/certificate-request', canRequestTaxCertificate, userController.requestCertificate);

// Get certificate request status
router.get('/certificate-requests', canRequestTaxCertificate, userController.getCertificateRequests);

// Download generated 80G PDF (any authenticated user; ownership checked in service)
router.get('/certificates/:id/download', userController.downloadCertificate);

// Subscribe to push notifications
router.post('/push-subscribe', userController.subscribePush);

// Get user's registered events
router.get('/events', userController.getUserEvents);

module.exports = router;
