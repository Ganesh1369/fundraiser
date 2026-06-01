const jwt = require('jsonwebtoken');
const db = require('../config/db');

// In-memory user cache — TTL 2 minutes, avoids DB hit on every authenticated request
const userCache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

const getCachedUser = (key) => {
    const entry = userCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { userCache.delete(key); return null; }
    return entry.data;
};

const setCachedUser = (key, data) => {
    userCache.set(key, { data, ts: Date.now() });
    // Evict old entries periodically
    if (userCache.size > 5000) {
        const now = Date.now();
        for (const [k, v] of userCache) {
            if (now - v.ts > CACHE_TTL) userCache.delete(k);
        }
    }
};

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check cache first
        let user = getCachedUser(`user:${decoded.userId}`);
        if (!user) {
            const result = await db.query(
                'SELECT id, name, email, user_type, referral_code FROM users WHERE id = ? AND is_active = true',
                [decoded.userId]
            );
            if (result.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'User not found or inactive' });
            }
            user = result.rows[0];
            setCachedUser(`user:${decoded.userId}`, user);
        }

        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token expired' });
        }
        next(error);
    }
};

// Verify admin token middleware
const verifyAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Access token required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.isAdmin) {
            return res.status(403).json({ success: false, message: 'Admin access required' });
        }

        // Check cache first
        let admin = getCachedUser(`admin:${decoded.userId}`);
        if (!admin) {
            const result = await db.query(
                'SELECT id, username, name, email FROM admin_users WHERE id = ? AND is_active = true',
                [decoded.userId]
            );
            if (result.rows.length === 0) {
                return res.status(401).json({ success: false, message: 'Admin not found or inactive' });
            }
            admin = result.rows[0];
            setCachedUser(`admin:${decoded.userId}`, admin);
        }

        req.admin = admin;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }
        next(error);
    }
};

// 80G certificates are available to individuals and organizations (both are
// tax-eligible). Students are excluded. The dashboard mirrors this gate at
// `dashboard.component.html` — keep the two in sync.
const canRequestTaxCertificate = (req, res, next) => {
    if (req.user.user_type !== 'organization' && req.user.user_type !== 'individual') {
        return res.status(403).json({
            success: false,
            message: 'The 80G certificate is only available for individual and organization donors.'
        });
    }
    next();
};

module.exports = {
    verifyToken,
    verifyAdmin,
    canRequestTaxCertificate
};
