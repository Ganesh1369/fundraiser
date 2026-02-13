const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Get user profile
 */
const getProfile = async (userId) => {
    const result = await db.query(
        `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                city, organization_name, pan_number, profile_pic,
                referral_code, referral_points, created_at
         FROM users WHERE id = ?`,
        [userId]
    );
    if (result.rows.length === 0) throw { status: 404, message: 'User not found' };

    const u = result.rows[0];
    return {
        id: u.id, userType: u.user_type, name: u.name, age: u.age,
        email: u.email, phone: u.phone, classGrade: u.class_grade,
        schoolName: u.school_name, city: u.city, organizationName: u.organization_name,
        panNumber: u.pan_number, profilePic: u.profile_pic,
        referralCode: u.referral_code,
        referralPoints: u.referral_points, createdAt: u.created_at
    };
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data) => {
    const { name, age, phone, city, schoolName, classGrade, organizationName, panNumber, userType } = data;

    // Validate userType if provided
    const validTypes = ['individual', 'student', 'organization'];
    const safeUserType = validTypes.includes(userType) ? userType : undefined;

    await db.query(
        `UPDATE users SET
            name = COALESCE(?, name), age = COALESCE(?, age),
            phone = COALESCE(?, phone), city = COALESCE(?, city),
            school_name = COALESCE(?, school_name), class_grade = COALESCE(?, class_grade),
            organization_name = COALESCE(?, organization_name), pan_number = COALESCE(?, pan_number),
            user_type = COALESCE(?, user_type)
         WHERE id = ?`,
        [name, age, phone, city, schoolName, classGrade, organizationName, panNumber, safeUserType, userId]
    );
    const result = await db.query('SELECT id, name, email, user_type FROM users WHERE id = ?', [userId]);
    return result.rows[0];
};

/**
 * Get user donations with optional period filter
 */
const getDonations = async (userId, period) => {
    let dateFilter = '';
    const params = [userId];

    switch (period) {
        case 'day': dateFilter = "AND created_at >= NOW() - INTERVAL 1 DAY"; break;
        case 'week': dateFilter = "AND created_at >= NOW() - INTERVAL 1 WEEK"; break;
        case 'month': dateFilter = "AND created_at >= NOW() - INTERVAL 1 MONTH"; break;
        case 'year': dateFilter = "AND created_at >= NOW() - INTERVAL 1 YEAR"; break;
    }

    const result = await db.query(
        `SELECT d.id, d.amount, d.currency, d.status, d.payment_method,
                d.razorpay_payment_id, d.created_at, d.request_80g,
                cr.status as certificate_status
         FROM donations d
         LEFT JOIN certificate_requests cr ON cr.donation_id = d.id
         WHERE d.user_id = ? ${dateFilter}
         ORDER BY d.created_at DESC`,
        params
    );

    return result.rows.map(d => ({
        id: d.id, amount: parseFloat(d.amount), currency: d.currency,
        status: d.status, paymentMethod: d.payment_method,
        paymentId: d.razorpay_payment_id, createdAt: d.created_at,
        request80g: d.request_80g, certificateStatus: d.certificate_status || null
    }));
};

/**
 * Get donation summary
 */
const getDonationSummary = async (userId) => {
    const result = await db.query(
        `SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount,
            COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= NOW() - INTERVAL 1 MONTH THEN amount ELSE 0 END), 0) as this_month
         FROM donations WHERE user_id = ?`,
        [userId]
    );
    const s = result.rows[0];
    return {
        totalDonations: parseInt(s.total_count),
        totalAmount: parseFloat(s.total_amount),
        thisMonthAmount: parseFloat(s.this_month)
    };
};

/**
 * Get referral stats
 */
const getReferrals = async (userId, referralCode) => {
    const statsResult = await db.query(
        `SELECT u.referral_points, COUNT(r.id) as referral_count
         FROM users u LEFT JOIN users r ON r.referred_by = u.id
         WHERE u.id = ? GROUP BY u.id, u.referral_points`,
        [userId]
    );

    const referredResult = await db.query(
        `SELECT name, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC LIMIT 10`,
        [userId]
    );

    const stats = statsResult.rows[0] || { referral_points: 0, referral_count: 0 };

    return {
        referralPoints: parseInt(stats.referral_points),
        referralCount: parseInt(stats.referral_count),
        referralCode,
        referralLink: `${process.env.FRONTEND_URL}/register?ref=${referralCode}`,
        recentReferrals: referredResult.rows
    };
};

/**
 * Get referral points history
 */
const getReferralPointsHistory = async (userId) => {
    const result = await db.query(
        `SELECT rph.points_earned, rph.donor_name, rph.created_at, d.amount as donation_amount
         FROM referral_points_history rph
         JOIN donations d ON d.id = rph.donation_id
         WHERE rph.user_id = ? ORDER BY rph.created_at DESC LIMIT 50`,
        [userId]
    );
    return result.rows.map(r => ({
        pointsEarned: r.points_earned, donorName: r.donor_name,
        donationAmount: parseFloat(r.donation_amount), createdAt: r.created_at
    }));
};

/**
 * Request 80G certificate
 */
const requestCertificate = async (userId, panNumber, donationId) => {
    if (!panNumber) throw { status: 400, message: 'PAN number is required' };

    if (donationId) {
        const donationCheck = await db.query(
            'SELECT id FROM donations WHERE id = ? AND user_id = ? AND status = ?',
            [donationId, userId, 'completed']
        );
        if (donationCheck.rows.length === 0) throw { status: 400, message: 'Invalid donation' };
    }

    const certId = uuidv4();
    await db.query(
        `INSERT INTO certificate_requests (id, user_id, donation_id, pan_number)
         VALUES (?, ?, ?, ?)`,
        [certId, userId, donationId || null, panNumber.toUpperCase()]
    );
    const result = await db.query('SELECT id, status, requested_at FROM certificate_requests WHERE id = ?', [certId]);
    return result.rows[0];
};

/**
 * Get certificate requests for a user
 */
const getCertificateRequests = async (userId) => {
    const result = await db.query(
        `SELECT cr.id, cr.pan_number, cr.status, cr.requested_at, cr.processed_at,
                d.amount as donation_amount, d.created_at as donation_date
         FROM certificate_requests cr
         LEFT JOIN donations d ON d.id = cr.donation_id
         WHERE cr.user_id = ?
         ORDER BY cr.requested_at DESC`,
        [userId]
    );
    return result.rows.map(r => ({
        id: r.id, panNumber: r.pan_number, status: r.status,
        requestedAt: r.requested_at, processedAt: r.processed_at,
        donationAmount: r.donation_amount ? parseFloat(r.donation_amount) : null,
        donationDate: r.donation_date
    }));
};

/**
 * Get events registered by the user
 */
const getUserEvents = async (userId) => {
    const result = await db.query(
        `SELECT e.id, e.event_name, e.event_date, e.event_location, e.banner_url,
                er.registration_status, er.created_at as registered_at
         FROM event_registrations er
         JOIN events e ON e.id = er.event_id
         WHERE er.user_id = ?
         ORDER BY e.event_date DESC`,
        [userId]
    );
    return result.rows;
};

/**
 * Update profile picture path
 */
const updateProfilePic = async (userId, profilePic) => {
    await db.query('UPDATE users SET profile_pic = ? WHERE id = ?', [profilePic, userId]);
};

module.exports = {
    getProfile, updateProfile, updateProfilePic, getDonations, getDonationSummary,
    getReferrals, getReferralPointsHistory, requestCertificate, getCertificateRequests,
    getUserEvents
};
