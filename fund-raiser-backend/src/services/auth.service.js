const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const emailService = require('./email.service');
const smsService = require('./sms.service');

/**
 * Generate unique referral code
 */
const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FR';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * Generate a 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP for verification
 * For registration: identifier is phone number, sent via SMS
 * For reset_password: identifier is email, sent via email
 */
const sendOtp = async (identifier, purpose = 'register') => {
    if (purpose === 'register') {
        // identifier is phone number — check phone uniqueness
        const existing = await db.query('SELECT id FROM users WHERE phone = ?', [identifier]);
        if (existing.rows.length > 0) {
            throw { status: 400, message: 'Phone number already registered. Please sign in instead.' };
        }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this identifier+purpose
    await db.query(
        `UPDATE otp_verifications SET verified = true WHERE email = ? AND purpose = ? AND verified = false`,
        [identifier.toLowerCase(), purpose]
    );

    // Store new OTP (email column stores phone for registration)
    await db.query(
        `INSERT INTO otp_verifications (email, otp, purpose, expires_at) VALUES (?, ?, ?, ?)`,
        [identifier.toLowerCase(), otp, purpose, expiresAt]
    );

    // Send OTP
    if (purpose === 'register') {
        await smsService.sendOtpSms(identifier, otp);
    } else {
        await emailService.sendPasswordResetEmail(identifier, otp);
    }

    return { message: 'OTP sent successfully' };
};

/**
 * Verify OTP
 */
const verifyOtp = async (email, otp, purpose = 'register') => {
    const result = await db.query(
        `SELECT id, otp, expires_at FROM otp_verifications
         WHERE email = ? AND purpose = ? AND verified = false
         ORDER BY created_at DESC LIMIT 1`,
        [email.toLowerCase(), purpose]
    );

    if (result.rows.length === 0) {
        throw { status: 400, message: 'No OTP found. Please request a new one.' };
    }

    const record = result.rows[0];

    if (new Date() > new Date(record.expires_at)) {
        throw { status: 400, message: 'OTP has expired. Please request a new one.' };
    }

    if (record.otp !== otp) {
        throw { status: 400, message: 'Invalid OTP. Please try again.' };
    }

    // Mark as verified
    await db.query(`UPDATE otp_verifications SET verified = true WHERE id = ?`, [record.id]);

    return { verified: true };
};

/**
 * Register a new user (requires verified OTP)
 */
const registerUser = async (userData) => {
    const {
        userType, name, age, email, phone, password,
        classGrade, schoolName,
        organizationName, panNumber, referralCode
    } = userData;

    if (!phone) throw { status: 400, message: 'Phone number is required' };
    // OTP verification gate removed — general registration is open (no SMS / no ₹300 fee).

    // Look up any existing account on this email. If one exists but is a stub
    // (created via passwordless /auth/email-login — marked by empty phone), we
    // upgrade it in place so all prior donations / points / certificates stay
    // attached to the same user_id. If it's a real registered account, block.
    const existingUser = await db.query(
        `SELECT id, phone, referral_code, referred_by
         FROM users WHERE email = ?`,
        [email.toLowerCase()]
    );
    const stubToUpgrade = existingUser.rows[0]
        && (existingUser.rows[0].phone == null || existingUser.rows[0].phone === '')
        ? existingUser.rows[0]
        : null;
    if (existingUser.rows.length > 0 && !stubToUpgrade) {
        throw { status: 400, message: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Resolve referrer (used on both insert and stub-upgrade paths)
    let referrerId = null;
    if (referralCode) {
        const referrer = await db.query(
            'SELECT id FROM users WHERE referral_code = ? AND is_active = true',
            [referralCode.toUpperCase()]
        );
        if (referrer.rows.length > 0) referrerId = referrer.rows[0].id;
    }

    let userId;

    if (stubToUpgrade) {
        userId = stubToUpgrade.id;
        // Only set referred_by if the stub doesn't already have one — never
        // overwrite an existing referral link.
        const finalReferrerId = stubToUpgrade.referred_by || referrerId;
        await db.query(
            `UPDATE users SET
                user_type = ?, name = ?, age = ?, phone = ?, password_hash = ?,
                class_grade = ?, school_name = ?,
                organization_name = ?, pan_number = ?,
                referred_by = COALESCE(referred_by, ?),
                email_verified = true
             WHERE id = ?`,
            [
                userType, name, age || null, phone, passwordHash,
                classGrade || null, schoolName || null,
                organizationName || null, panNumber || null,
                finalReferrerId,
                userId
            ]
        );
    } else {
        // Generate unique referral code (only needed on fresh insert — stubs
        // already have one from email-login).
        let newReferralCode;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = generateReferralCode();
            const codeCheck = await db.query('SELECT id FROM users WHERE referral_code = ?', [newReferralCode]);
            if (codeCheck.rows.length === 0) isUnique = true;
        }

        userId = uuidv4();
        await db.query(
            `INSERT INTO users (
                id, user_type, name, age, email, phone, password_hash,
                class_grade, school_name,
                organization_name, pan_number, referral_code, referred_by, email_verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
            [
                userId, userType, name, age || null, email.toLowerCase(), phone, passwordHash,
                classGrade || null, schoolName || null,
                organizationName || null, panNumber || null, newReferralCode, referrerId
            ]
        );
    }

    const userResult = await db.query('SELECT id, name, email, user_type, referral_code FROM users WHERE id = ?', [userId]);
    const user = userResult.rows[0];

    // Generate JWT token
    const token = jwt.sign(
        { userId: user.id, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            referralCode: user.referral_code
        },
        token
    };
};

/**
 * Login existing user
 */
const loginUser = async (email, password) => {
    const result = await db.query(
        `SELECT id, name, email, password_hash, user_type, referral_code, referral_points
         FROM users WHERE email = ? AND is_active = true`,
        [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
        throw { status: 401, message: 'Invalid credentials' };
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw { status: 401, message: 'Invalid credentials' };
    }

    const token = jwt.sign(
        { userId: user.id, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            referralCode: user.referral_code,
            referralPoints: user.referral_points
        },
        token
    };
};

/**
 * Passwordless sign-in with name + email.
 * Finds the user by email, or creates a lightweight account if none exists,
 * then issues a JWT and sends a sign-in acknowledgement email.
 * NOTE: there is no password/verification here — anyone with an email can enter.
 */
const emailLogin = async (name, email) => {
    const normEmail = email.toLowerCase().trim();
    const cleanName = (name || '').trim();

    let result = await db.query(
        `SELECT id, name, email, user_type, referral_code, referral_points
         FROM users WHERE email = ? AND is_active = true`,
        [normEmail]
    );

    let user;
    if (result.rows.length > 0) {
        user = result.rows[0];
    } else {
        // Create a new passwordless account. phone + password_hash are NOT NULL
        // in the schema, so store an empty phone and a random, unusable hash.
        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(uuidv4(), 12); // never matches any login

        let newReferralCode;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = generateReferralCode();
            const codeCheck = await db.query('SELECT id FROM users WHERE referral_code = ?', [newReferralCode]);
            if (codeCheck.rows.length === 0) isUnique = true;
        }

        await db.query(
            `INSERT INTO users (id, user_type, name, email, phone, password_hash, referral_code, email_verified)
             VALUES (?, 'individual', ?, ?, '', ?, ?, true)`,
            [userId, cleanName || 'Friend', normEmail, passwordHash, newReferralCode]
        );

        const created = await db.query(
            `SELECT id, name, email, user_type, referral_code, referral_points FROM users WHERE id = ?`,
            [userId]
        );
        user = created.rows[0];
    }

    const token = jwt.sign(
        { userId: user.id, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Best-effort acknowledgement email — never block sign-in on email failure.
    try {
        await emailService.sendLoginAcknowledgementEmail(user.email, user.name);
    } catch (err) {
        console.warn('Login acknowledgement email failed:', err.message);
    }

    return {
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            referralCode: user.referral_code,
            referralPoints: user.referral_points
        },
        token
    };
};

/**
 * Admin login
 */
const adminLogin = async (username, password) => {
    const result = await db.query(
        'SELECT id, username, password_hash, name, email FROM admin_users WHERE username = ? AND is_active = true',
        [username]
    );

    if (result.rows.length === 0) {
        throw { status: 401, message: 'Invalid credentials' };
    }

    const admin = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    if (!isValidPassword) {
        throw { status: 401, message: 'Invalid credentials' };
    }

    const token = jwt.sign(
        { userId: admin.id, isAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    return {
        admin: {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            email: admin.email
        },
        token
    };
};

/**
 * Forgot password — send reset OTP
 */
const forgotPassword = async (email) => {
    const user = await db.query('SELECT id FROM users WHERE email = ? AND is_active = true', [email.toLowerCase()]);
    if (user.rows.length === 0) {
        throw { status: 404, message: 'No account found with this email' };
    }
    return sendOtp(email, 'reset_password');
};

/**
 * Reset password with verified OTP
 */
const resetPassword = async (email, otp, newPassword) => {
    // Verify OTP first
    await verifyOtp(email, otp, 'reset_password');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db.query(
        'UPDATE users SET password_hash = ? WHERE email = ?',
        [passwordHash, email.toLowerCase()]
    );

    return { message: 'Password reset successfully' };
};

/**
 * Validate referral code
 */
const validateReferralCode = async (code) => {
    const result = await db.query(
        'SELECT name FROM users WHERE referral_code = ? AND is_active = true',
        [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
        throw { status: 404, message: 'Invalid referral code' };
    }

    return { referrerName: result.rows[0].name };
};

module.exports = {
    sendOtp,
    verifyOtp,
    registerUser,
    loginUser,
    emailLogin,
    adminLogin,
    forgotPassword,
    resetPassword,
    validateReferralCode
};
