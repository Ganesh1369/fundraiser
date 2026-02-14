const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middleware/auth.middleware');

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

// Get user donations with filters
router.get('/donations', userController.getDonations);

// Get donation summary
router.get('/donations/summary', userController.getDonationSummary);

// Get referral statistics
router.get('/referrals', userController.getReferrals);

// Get referral points history
router.get('/referrals/history', userController.getReferralPointsHistory);

// Request 80G certificate
router.post('/certificate-request', userController.requestCertificate);

// Get certificate request status
router.get('/certificate-requests', userController.getCertificateRequests);

// Subscribe to push notifications
router.post('/push-subscribe', userController.subscribePush);

// Get user's registered events
router.get('/events', userController.getUserEvents);

module.exports = router;
