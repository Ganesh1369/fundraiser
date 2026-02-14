const xlsx = require('xlsx');
const db = require('../config/db');
const emailService = require('./email.service');

// In-memory cache for expensive queries (stats, leaderboard)
const cache = new Map();
const cached = (key, ttlMs, fn) => async (...args) => {
    const cacheKey = `${key}:${JSON.stringify(args)}`;
    const entry = cache.get(cacheKey);
    if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
    const data = await fn(...args);
    cache.set(cacheKey, { data, ts: Date.now() });
    return data;
};

/**
 * Get dashboard statistics (cached 30s)
 */
const _getDashboardStats = async () => {
    const userStats = await db.query(
        `SELECT user_type, COUNT(*) as count FROM users WHERE is_active = true GROUP BY user_type`
    );
    const donationStats = await db.query(
        `SELECT
            COUNT(*) as total_count,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_amount,
            COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= NOW() - INTERVAL 1 MONTH THEN amount ELSE 0 END), 0) as this_month,
            COALESCE(SUM(CASE WHEN status = 'completed' AND created_at >= NOW() - INTERVAL 7 DAY THEN amount ELSE 0 END), 0) as this_week
         FROM donations WHERE purpose = 'donation'`
    );
    const certStats = await db.query(
        `SELECT status, COUNT(*) as count FROM certificate_requests GROUP BY status`
    );
    const recentUsers = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL 7 DAY`
    );

    const usersByType = {};
    userStats.rows.forEach(row => { usersByType[row.user_type] = parseInt(row.count); });
    const certsByStatus = {};
    certStats.rows.forEach(row => { certsByStatus[row.status] = parseInt(row.count); });

    return {
        users: {
            total: Object.values(usersByType).reduce((a, b) => a + b, 0),
            byType: usersByType,
            newThisWeek: parseInt(recentUsers.rows[0].count)
        },
        donations: {
            totalAmount: parseFloat(donationStats.rows[0].total_amount),
            totalCount: parseInt(donationStats.rows[0].total_count),
            thisMonth: parseFloat(donationStats.rows[0].this_month),
            thisWeek: parseFloat(donationStats.rows[0].this_week)
        },
        certificates: certsByStatus
    };
};
const getDashboardStats = cached('stats', 30000, _getDashboardStats);

/**
 * Get registrations with filters
 */
const getRegistrations = async ({ userType, fromDate, toDate, page = 1, limit = 20, search }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = ['is_active = true'];

    if (userType) { whereConditions.push(`user_type = ?`); params.push(userType); }
    if (fromDate) { whereConditions.push(`created_at >= ?`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`created_at <= ?`); params.push(toDate); }
    if (search) {
        whereConditions.push(`(name LIKE ? OR email LIKE ? OR phone LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    const countResult = await db.query(`SELECT COUNT(*) as count FROM users ${whereClause}`, params);

    const result = await db.query(
        `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                city, organization_name, referral_code, referral_points, registration_fee_paid, created_at
         FROM users ${whereClause}
         ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return {
        registrations: result.rows,
        pagination: {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page), limit: parseInt(limit),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    };
};

/**
 * Export registrations to Excel buffer
 */
const exportRegistrations = async ({ userType, fromDate, toDate }) => {
    const params = [];
    let whereConditions = ['u.is_active = true'];

    if (userType) { whereConditions.push(`u.user_type = ?`); params.push(userType); }
    if (fromDate) { whereConditions.push(`u.created_at >= ?`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`u.created_at <= ?`); params.push(toDate); }
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const result = await db.query(
        `SELECT u.user_type as "User Type", u.name as "Name", u.age as "Age",
                u.email as "Email", u.phone as "Phone",
                u.class_grade as "Class / Grade", u.school_name as "School Name",
                u.area as "Area", u.locality as "Locality", u.city as "City",
                u.organization_name as "Organization Name", u.pan_number as "PAN Number",
                u.referral_code as "Referral Code",
                r.name as "Referred By",
                u.referral_points as "Referral Points",
                u.email_verified as "Email Verified",
                u.registration_fee_paid as "Fee Paid",
                u.created_at as "Registered At"
         FROM users u
         LEFT JOIN users r ON r.id = u.referred_by
         ${whereClause} ORDER BY u.created_at DESC`,
        params
    );

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(result.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Get donations with filters
 */
const getDonations = async ({ status, fromDate, toDate, page = 1, limit = 20 }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [`d.purpose = 'donation'`];

    if (status) { whereConditions.push(`d.status = ?`); params.push(status); }
    if (fromDate) { whereConditions.push(`d.created_at >= ?`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`d.created_at <= ?`); params.push(toDate); }
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const countResult = await db.query(`SELECT COUNT(*) as count FROM donations d ${whereClause}`, params);

    const result = await db.query(
        `SELECT d.id, d.user_id, d.amount, d.currency, d.status, d.payment_method,
                d.razorpay_payment_id, d.created_at,
                u.name as user_name, u.email as user_email, u.user_type
         FROM donations d JOIN users u ON u.id = d.user_id
         ${whereClause} ORDER BY d.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return {
        donations: result.rows.map(d => ({ ...d, amount: parseFloat(d.amount) })),
        pagination: {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page), limit: parseInt(limit),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    };
};

/**
 * Export donations to Excel buffer
 */
const exportDonations = async ({ status, fromDate, toDate }) => {
    const params = [];
    let whereConditions = [`d.purpose = 'donation'`];

    if (status) { whereConditions.push(`d.status = ?`); params.push(status); }
    if (fromDate) { whereConditions.push(`d.created_at >= ?`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`d.created_at <= ?`); params.push(toDate); }
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const result = await db.query(
        `SELECT u.name as "Donor Name", u.email as "Donor Email", u.phone as "Donor Phone",
                u.user_type as "Donor Type", u.city as "Donor City",
                d.amount as "Amount (INR)", d.currency as "Currency", d.status as "Payment Status",
                d.payment_method as "Payment Method",
                d.razorpay_order_id as "Razorpay Order ID",
                d.razorpay_payment_id as "Razorpay Payment ID",
                d.request_80g as "80G Certificate Requested",
                ref.name as "Referrer Name",
                e.event_name as "Event",
                d.created_at as "Donation Date"
         FROM donations d
         JOIN users u ON u.id = d.user_id
         LEFT JOIN users ref ON ref.id = d.referrer_id
         LEFT JOIN events e ON e.id = d.event_id
         ${whereClause} ORDER BY d.created_at DESC`,
        params
    );

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(result.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Donations');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Get user analytics
 */
const getUserAnalytics = async (userId) => {
    const userResult = await db.query(
        `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                address_line_1, address_line_2, area, city, state, pincode,
                organization_name, pan_number, profile_pic,
                referral_code, referral_points, created_at
         FROM users WHERE id = ?`,
        [userId]
    );
    if (userResult.rows.length === 0) throw { status: 404, message: 'User not found' };

    const donations = await db.query(
        `SELECT id, amount, status, razorpay_payment_id, created_at FROM donations WHERE user_id = ? AND purpose = 'donation' ORDER BY created_at DESC`,
        [userId]
    );

    const referralResult = await db.query(
        `SELECT COUNT(*) as referred_count,
                (SELECT COUNT(*) FROM donations d JOIN users u ON u.id = d.user_id WHERE u.referred_by = ? AND d.status = 'completed' AND d.purpose = 'donation') as donations_from_referrals,
                (SELECT COALESCE(SUM(d.amount), 0) FROM donations d JOIN users u ON u.id = d.user_id WHERE u.referred_by = ? AND d.status = 'completed' AND d.purpose = 'donation') as amount_from_referrals
         FROM users WHERE referred_by = ?`,
        [userId, userId, userId]
    );

    const referredUsers = await db.query(
        `SELECT u.id, u.name, u.email, u.user_type, u.created_at,
                COALESCE(SUM(CASE WHEN d.status = 'completed' AND d.purpose = 'donation' THEN d.amount ELSE 0 END), 0) as total_donated
         FROM users u LEFT JOIN donations d ON d.user_id = u.id
         WHERE u.referred_by = ? GROUP BY u.id ORDER BY u.created_at DESC`,
        [userId]
    );

    const eventRegistrations = await db.query(
        `SELECT er.registration_status, er.created_at, e.id as event_id, e.event_name, e.event_type, e.event_date
         FROM event_registrations er JOIN events e ON e.id = er.event_id
         WHERE er.user_id = ? ORDER BY er.created_at DESC`,
        [userId]
    );

    const certificates = await db.query(
        `SELECT cr.id, cr.pan_number, cr.status, cr.requested_at, cr.processed_at,
                d.amount as donation_amount
         FROM certificate_requests cr LEFT JOIN donations d ON d.id = cr.donation_id
         WHERE cr.user_id = ? ORDER BY cr.requested_at DESC`,
        [userId]
    );

    const user = userResult.rows[0];
    const referralStats = referralResult.rows[0];

    return {
        user,
        donations: {
            history: donations.rows.map(d => ({ ...d, amount: parseFloat(d.amount) })),
            totalAmount: donations.rows.filter(d => d.status === 'completed').reduce((sum, d) => sum + parseFloat(d.amount), 0),
            count: donations.rows.length
        },
        referrals: {
            count: parseInt(referralStats.referred_count),
            donationsGenerated: parseInt(referralStats.donations_from_referrals),
            amountGenerated: parseFloat(referralStats.amount_from_referrals),
            points: user.referral_points,
            users: referredUsers.rows.map(u => ({ ...u, total_donated: parseFloat(u.total_donated) }))
        },
        eventRegistrations: eventRegistrations.rows,
        certificates: certificates.rows.map(c => ({
            ...c,
            donation_amount: c.donation_amount ? parseFloat(c.donation_amount) : null
        }))
    };
};

/**
 * Get leaderboard with optional user type filter
 */
const _getLeaderboard = async ({ limit = 50, userType }) => {
    limit = parseInt(limit);
    let query = `SELECT * FROM leaderboard`;
    const params = [];

    if (userType) {
        query += ` WHERE user_type = ?`;
        params.push(userType);
    }

    // Re-order after filtering since the view might have different order
    query += ` ORDER BY score DESC LIMIT ${limit}`;

    const result = await db.query(query, params);

    return result.rows.map((row, index) => ({
        rank: index + 1,
        id: row.id,
        name: row.name,
        email: row.email,
        city: row.city,
        userType: row.user_type,
        totalDonations: parseFloat(row.total_donations),
        donationCount: parseInt(row.donation_count || 0),
        referralPoints: parseInt(row.referral_points),
        score: parseFloat(row.score)
    }));
};
const getLeaderboard = cached('leaderboard', 30000, _getLeaderboard);

/**
 * Export leaderboard to Excel buffer
 */
const exportLeaderboard = async () => {
    const result = await db.query(
        `SELECT name as "Name", email as "Email", user_type as "User Type", city as "City",
                total_donations as "Total Donations (INR)", donation_count as "Number of Donations",
                referral_points as "Referral Points", score as "Total Score"
         FROM leaderboard`
    );

    const dataWithRank = result.rows.map((row, index) => ({ 'Rank': index + 1, ...row }));
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(dataWithRank);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Leaderboard');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Get certificate requests with filters
 */
const getCertificateRequests = async ({ status, page = 1, limit = 20 }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];

    if (status) { whereConditions.push(`cr.status = ?`); params.push(status); }
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countResult = await db.query(`SELECT COUNT(*) as count FROM certificate_requests cr ${whereClause}`, params);

    const result = await db.query(
        `SELECT cr.id, cr.pan_number, cr.status, cr.admin_notes,
                cr.requested_at, cr.processed_at,
                u.name as user_name, u.email as user_email,
                d.amount as donation_amount, d.created_at as donation_date
         FROM certificate_requests cr
         JOIN users u ON u.id = cr.user_id
         LEFT JOIN donations d ON d.id = cr.donation_id
         ${whereClause}
         ORDER BY cr.requested_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return {
        requests: result.rows.map(r => ({
            ...r,
            donation_amount: r.donation_amount ? parseFloat(r.donation_amount) : null
        })),
        pagination: {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page), limit: parseInt(limit),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    };
};

/**
 * Export certificate requests to Excel buffer
 */
const exportCertificates = async ({ status }) => {
    const params = [];
    let whereConditions = [];

    if (status) { whereConditions.push(`cr.status = ?`); params.push(status); }
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const result = await db.query(
        `SELECT u.name as "User Name", u.email as "Email", u.phone as "Phone",
                u.user_type as "User Type", u.organization_name as "Organization",
                cr.pan_number as "PAN Number",
                d.amount as "Donation Amount (INR)", d.created_at as "Donation Date",
                cr.status as "Certificate Status",
                cr.requested_at as "Requested At", cr.processed_at as "Processed At",
                cr.admin_notes as "Admin Notes"
         FROM certificate_requests cr
         JOIN users u ON u.id = cr.user_id
         LEFT JOIN donations d ON d.id = cr.donation_id
         ${whereClause} ORDER BY cr.requested_at DESC`,
        params
    );

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(result.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, '80G Certificates');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Update certificate request status
 */
const updateCertificateStatus = async (id, { status, adminNotes, certificateUrl }) => {
    const validStatuses = ['pending', 'processing', 'approved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
        throw { status: 400, message: 'Invalid status' };
    }

    const updateResult = await db.query(
        `UPDATE certificate_requests
         SET status = COALESCE(?, status),
             admin_notes = COALESCE(?, admin_notes),
             certificate_url = COALESCE(?, certificate_url),
             processed_at = CASE WHEN ? IN ('approved', 'rejected') THEN NOW() ELSE processed_at END
         WHERE id = ?`,
        [status, adminNotes, certificateUrl, status, id]
    );

    if (updateResult.rowCount === 0) throw { status: 404, message: 'Certificate request not found' };
    const result = await db.query('SELECT * FROM certificate_requests WHERE id = ?', [id]);

    // Send approval email
    if (status === 'approved') {
        const userResult = await db.query('SELECT name, email FROM users WHERE id = ?', [result.rows[0].user_id]);
        if (userResult.rows.length > 0) {
            emailService.sendCertificateApprovedEmail(
                userResult.rows[0].email,
                userResult.rows[0].name
            ).catch(err => console.error('Failed to send certificate approval email:', err.message));
        }
    }

    return result.rows[0];
};

/**
 * Get user ID by URL slug (e.g. "kamalraj-ganesan" → user ID)
 */
const getUserBySlug = async (slug) => {
    const result = await db.query(
        `SELECT id FROM users WHERE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '')) = LOWER(REGEXP_REPLACE(?, '-', ' ')) AND is_active = true LIMIT 1`,
        [slug]
    );
    if (result.rows.length === 0) {
        // Fallback: try LIKE with slug converted to space-separated pattern
        const namePattern = slug.replace(/-/g, ' ');
        const fallback = await db.query(
            `SELECT id FROM users WHERE name LIKE ? AND is_active = true LIMIT 1`,
            [namePattern]
        );
        if (fallback.rows.length === 0) throw { status: 404, message: 'User not found' };
        return { id: fallback.rows[0].id };
    }
    return { id: result.rows[0].id };
};

module.exports = {
    getDashboardStats, getRegistrations, exportRegistrations,
    getDonations, exportDonations, getUserAnalytics,
    getLeaderboard, exportLeaderboard,
    getCertificateRequests, exportCertificates, updateCertificateStatus,
    getUserBySlug
};
