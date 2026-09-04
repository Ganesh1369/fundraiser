const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const ctrl = require('../controllers/csr-enquiry-admin.controller');
const { verifyAdmin, requireAdminRole } = require('../middleware/auth.middleware');

/**
 * Admin CSR enquiry module.
 *
 * Paths are `/admin/csr-enquiries/...` rather than `/admin/csr/...`: main's Phase 2.2
 * module owns `/admin/csr/:id`, which would otherwise capture these.
 *
 * Role split — sub-admins work enquiries day to day (status, notes, milestones, uploads,
 * exports) but cannot reassign ownership, restate committed money, delete documents or
 * change who gets alerted. Those are the actions with commercial or audit consequences.
 */

const uploadDir = path.join(__dirname, '../../uploads/csr');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        // Timestamped + randomised: a re-upload of the same filename must not overwrite the
        // document an earlier row still points at.
        const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
        cb(null, `csr-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const ALLOWED_MIME = new Set([
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_MIME.has(file.mimetype)) {
            return cb(Object.assign(
                new Error('Unsupported file type. Allowed: PDF, Word, Excel, JPG, PNG, WebP.'),
                { status: 400 }
            ));
        }
        cb(null, true);
    }
});

/** Turn multer's own errors into the JSON shape the rest of the API returns. */
const handleUpload = (req, res, next) => {
    upload.single('document')(req, res, (err) => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large (10 MB maximum).'
            : err.message || 'Upload failed.';
        res.status(err.status || 400).json({ success: false, message });
    });
};

router.use('/admin/csr-enquiries', verifyAdmin);

// Reference data for filters
router.get('/admin/csr-enquiries/meta', ctrl.getMeta);

// Assignable owners — a name and an email, not a login account
router.post('/admin/csr-enquiries/owners', ctrl.createOwner);

// Reporting — declared before /:id so the literal segments are not read as an id
router.get('/admin/csr-enquiries/report/pipeline', ctrl.pipelineReport);
router.get('/admin/csr-enquiries/export', ctrl.exportEnquiries);

// List + detail
router.get('/admin/csr-enquiries', ctrl.list);
router.get('/admin/csr-enquiries/:id', ctrl.getById);

// Workflow
router.patch('/admin/csr-enquiries/:id/status', ctrl.updateStatus);
router.patch('/admin/csr-enquiries/:id/owner', requireAdminRole('admin'), ctrl.assignOwner);
router.patch('/admin/csr-enquiries/:id/amounts', requireAdminRole('admin'), ctrl.updateAmounts);

// Notes
router.post('/admin/csr-enquiries/:id/notes', ctrl.addNote);

// Milestones
router.post('/admin/csr-enquiries/:id/milestones', ctrl.addMilestone);
router.put('/admin/csr-enquiries/:id/milestones/:milestoneId', ctrl.updateMilestone);
router.delete('/admin/csr-enquiries/:id/milestones/:milestoneId', requireAdminRole('admin'), ctrl.deleteMilestone);

// Documents
router.post('/admin/csr-enquiries/:id/documents', handleUpload, ctrl.uploadDocument);
router.get('/admin/csr-enquiries/:id/documents/:documentId', ctrl.downloadDocument);
router.delete('/admin/csr-enquiries/:id/documents/:documentId', requireAdminRole('admin'), ctrl.deleteDocument);

// Status alert configuration
router.put('/admin/csr-enquiries/alerts/:status', requireAdminRole('admin'), ctrl.updateAlertConfig);

module.exports = router;
