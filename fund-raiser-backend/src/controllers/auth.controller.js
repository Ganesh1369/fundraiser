const authService = require('../services/auth.service');

// Send OTP
exports.sendOtp = async (req, res, next) => {
    try {
        const { email, purpose } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        const result = await authService.sendOtp(email, purpose || 'register');
        res.json({ success: true, message: result.message });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Verify OTP
exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp, purpose } = req.body;
        if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });
        const result = await authService.verifyOtp(email, otp, purpose || 'register');
        res.json({ success: true, data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// User Registration
exports.register = async (req, res, next) => {
    try {
        const { userType, name, email, phone, password } = req.body;
        if (!userType || !name || !email || !phone || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }
        const result = await authService.registerUser(req.body);
        res.status(201).json({ success: true, message: 'Registration successful', data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// User Login
exports.login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }
        const result = await authService.loginUser(email, password);
        res.json({ success: true, message: 'Login successful', data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Admin Login
exports.adminLogin = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please provide username and password' });
        }
        const result = await authService.adminLogin(username, password);
        res.json({ success: true, message: 'Admin login successful', data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
        const result = await authService.forgotPassword(email);
        res.json({ success: true, message: result.message });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }
        const result = await authService.resetPassword(email, otp, newPassword);
        res.json({ success: true, message: result.message });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};

// Validate Referral Code
exports.validateReferralCode = async (req, res, next) => {
    try {
        const { code } = req.params;
        const result = await authService.validateReferralCode(code);
        res.json({ success: true, data: result });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        next(error);
    }
};
