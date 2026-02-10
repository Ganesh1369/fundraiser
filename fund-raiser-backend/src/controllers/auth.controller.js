const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

// Generate unique referral code
const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FR';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// User Registration
exports.register = async (req, res, next) => {
    try {
        const {
            userType,
            name,
            age,
            email,
            phone,
            password,
            classGrade,
            schoolName,
            area,
            locality,
            city,
            organizationName,
            panNumber,
            referralCode
        } = req.body;

        // Validate required fields
        if (!userType || !name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields'
            });
        }

        // Check if email already exists
        const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email.toLowerCase()]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already registered'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Generate unique referral code
        let newReferralCode;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = generateReferralCode();
            const codeCheck = await db.query(
                'SELECT id FROM users WHERE referral_code = $1',
                [newReferralCode]
            );
            if (codeCheck.rows.length === 0) isUnique = true;
        }

        // Check referrer if referral code provided
        let referrerId = null;
        if (referralCode) {
            const referrer = await db.query(
                'SELECT id FROM users WHERE referral_code = $1 AND is_active = true',
                [referralCode.toUpperCase()]
            );
            if (referrer.rows.length > 0) {
                referrerId = referrer.rows[0].id;
            }
        }

        // Insert new user
        const result = await db.query(
            `INSERT INTO users (
                user_type, name, age, email, phone, password_hash,
                class_grade, school_name, area, locality, city,
                organization_name, pan_number, referral_code, referred_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, name, email, user_type, referral_code`,
            [
                userType,
                name,
                age || null,
                email.toLowerCase(),
                phone,
                passwordHash,
                classGrade || null,
                schoolName || null,
                area || null,
                locality || null,
                city || null,
                organizationName || null,
                panNumber || null,
                newReferralCode,
                referrerId
            ]
        );

        const user = result.rows[0];

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, userType: user.user_type },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: user.user_type,
                    referralCode: user.referral_code
                },
                token
            }
        });

    } catch (error) {
        next(error);
    }
};

// User Login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Get user
        const result = await db.query(
            `SELECT id, name, email, password_hash, user_type, referral_code, referral_points
             FROM users WHERE email = $1 AND is_active = true`,
            [email.toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, userType: user.user_type },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    userType: user.user_type,
                    referralCode: user.referral_code,
                    referralPoints: user.referral_points
                },
                token
            }
        });

    } catch (error) {
        next(error);
    }
};

// Admin Login
exports.adminLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide username and password'
            });
        }

        // Get admin
        const result = await db.query(
            'SELECT id, username, password_hash, name, email FROM admin_users WHERE username = $1 AND is_active = true',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const admin = result.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: admin.id, isAdmin: true },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                admin: {
                    id: admin.id,
                    username: admin.username,
                    name: admin.name,
                    email: admin.email
                },
                token
            }
        });

    } catch (error) {
        next(error);
    }
};

// Validate Referral Code
exports.validateReferralCode = async (req, res, next) => {
    try {
        const { code } = req.params;

        const result = await db.query(
            'SELECT name FROM users WHERE referral_code = $1 AND is_active = true',
            [code.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invalid referral code'
            });
        }

        res.json({
            success: true,
            data: {
                referrerName: result.rows[0].name
            }
        });

    } catch (error) {
        next(error);
    }
};
