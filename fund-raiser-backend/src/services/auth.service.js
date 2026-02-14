const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const emailService = require('./email.service');

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
 * Send OTP for email verification
 */
const sendOtp = async (email, purpose = 'register') => {
    // Block OTP for already-registered emails during registration
    if (purpose === 'register') {
        const existing = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            throw { status: 400, message: 'Email already registered. Please sign in instead.' };
        }
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this email+purpose
    await db.query(
        `UPDATE otp_verifications SET verified = true WHERE email = ? AND purpose = ? AND verified = false`,
        [email.toLowerCase(), purpose]
    );

    // Store new OTP
    await db.query(
        `INSERT INTO otp_verifications (email, otp, purpose, expires_at) VALUES (?, ?, ?, ?)`,
        [email.toLowerCase(), otp, purpose, expiresAt]
    );

    // Send email
    if (purpose === 'register') {
        await emailService.sendOtpEmail(email, otp);
    } else {
        await emailService.sendPasswordResetEmail(email, otp);
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

    // Check email already exists
    const existingUser = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
        throw { status: 400, message: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 16);

    // Generate unique referral code
    let newReferralCode;
    let isUnique = false;
    while (!isUnique) {
        newReferralCode = generateReferralCode();
        const codeCheck = await db.query('SELECT id FROM users WHERE referral_code = ?', [newReferralCode]);
        if (codeCheck.rows.length === 0) isUnique = true;
    }

    // Check referrer
    let referrerId = null;
    if (referralCode) {
        const referrer = await db.query(
            'SELECT id FROM users WHERE referral_code = ? AND is_active = true',
            [referralCode.toUpperCase()]
        );
        if (referrer.rows.length > 0) referrerId = referrer.rows[0].id;
    }

    // Insert user
    const userId = uuidv4();
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

    const passwordHash = await bcrypt.hash(newPassword, 16);
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
    adminLogin,
    forgotPassword,
    resetPassword,
    validateReferralCode
};
