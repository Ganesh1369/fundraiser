const db = require('../config/db');

/**
 * Get user profile
 */
const getProfile = async (userId) => {
    const result = await db.query(
        `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                area, locality, city, organization_name, pan_number,
                referral_code, referral_points, created_at
         FROM users WHERE id = $1`,
        [userId]
    );
    if (result.rows.length === 0) throw { status: 404, message: 'User not found' };

    const u = result.rows[0];
    return {
        id: u.id, userType: u.user_type, name: u.name, age: u.age,
        email: u.email, phone: u.phone, classGrade: u.class_grade,
        schoolName: u.school_name, area: u.area, locality: u.locality,
        city: u.city, organizationName: u.organization_name,
        panNumber: u.pan_number, referralCode: u.referral_code,
        referralPoints: u.referral_points, createdAt: u.created_at
    };
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data) => {
    const { name, age, phone, area, locality, city, schoolName, classGrade } = data;
    const result = await db.query(
        `UPDATE users SET 
            name = COALESCE($1, name), age = COALESCE($2, age),
            phone = COALESCE($3, phone), area = COALESCE($4, area),
            locality = COALESCE($5, locality), city = COALESCE($6, city),
            school_name = COALESCE($7, school_name), class_grade = COALESCE($8, class_grade)
         WHERE id = $9 RETURNING id, name, email`,
        [name, age, phone, area, locality, city, schoolName, classGrade, userId]
    );
    return result.rows[0];
};

/**
 * Get user donations with optional period filter
 */
const getDonations = async (userId, period) => {
    let dateFilter = '';
    const params = [userId];

    switch (period) {
        case 'day': dateFilter = "AND created_at >= NOW() - INTERVAL '1 day'"; break;
        case 'week': dateFilter = "AND created_at >= NOW() - INTERVAL '1 week'"; break;
        case 'month': dateFilter = "AND created_at >= NOW() - INTERVAL '1 month'"; break;
        case 'year': dateFilter = "AND created_at >= NOW() - INTERVAL '1 year'"; break;
    }

    const result = await db.query(
        `SELECT d.id, d.amount, d.currency, d.status, d.payment_method, 
                d.razorpay_payment_id, d.created_at, d.request_80g,
                cr.status as certificate_status
         FROM donations d
         LEFT JOIN certificate_requests cr ON cr.donation_id = d.id
         WHERE d.user_id = $1 ${dateFilter}
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
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_amount,
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 month'), 0) as this_month
         FROM donations WHERE user_id = $1`,
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
         WHERE u.id = $1 GROUP BY u.id, u.referral_points`,
        [userId]
    );

    const referredResult = await db.query(
        `SELECT name, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC LIMIT 10`,
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
         WHERE rph.user_id = $1 ORDER BY rph.created_at DESC LIMIT 50`,
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
            'SELECT id FROM donations WHERE id = $1 AND user_id = $2 AND status = $3',
            [donationId, userId, 'completed']
        );
        if (donationCheck.rows.length === 0) throw { status: 400, message: 'Invalid donation' };
    }

    const result = await db.query(
        `INSERT INTO certificate_requests (user_id, donation_id, pan_number)
         VALUES ($1, $2, $3) RETURNING id, status, requested_at`,
        [userId, donationId || null, panNumber.toUpperCase()]
    );
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
         WHERE cr.user_id = $1
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

module.exports = {
    getProfile, updateProfile, getDonations, getDonationSummary,
    getReferrals, getReferralPointsHistory, requestCertificate, getCertificateRequests
};
