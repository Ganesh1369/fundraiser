const xlsx = require('xlsx');
const db = require('../config/db');

/**
 * Get dashboard statistics
 */
const getDashboardStats = async () => {
    const userStats = await db.query(
        `SELECT user_type, COUNT(*) as count FROM users WHERE is_active = true GROUP BY user_type`
    );
    const donationStats = await db.query(
        `SELECT 
            COUNT(*) as total_count,
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_amount,
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 month'), 0) as this_month,
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) as this_week
         FROM donations`
    );
    const certStats = await db.query(
        `SELECT status, COUNT(*) as count FROM certificate_requests GROUP BY status`
    );
    const recentUsers = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
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

/**
 * Get registrations with filters
 */
const getRegistrations = async ({ userType, fromDate, toDate, page = 1, limit = 20, search }) => {
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = ['is_active = true'];
    let paramIndex = 1;

    if (userType) { whereConditions.push(`user_type = $${paramIndex++}`); params.push(userType); }
    if (fromDate) { whereConditions.push(`created_at >= $${paramIndex++}`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`created_at <= $${paramIndex++}`); params.push(toDate); }
    if (search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    const countResult = await db.query(`SELECT COUNT(*) FROM users ${whereClause}`, params);

    params.push(limit, offset);
    const result = await db.query(
        `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                city, organization_name, referral_code, referral_points, created_at
         FROM users ${whereClause}
         ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
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
    let paramIndex = 1;

    if (userType) { whereConditions.push(`u.user_type = $${paramIndex++}`); params.push(userType); }
    if (fromDate) { whereConditions.push(`u.created_at >= $${paramIndex++}`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`u.created_at <= $${paramIndex++}`); params.push(toDate); }
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
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];
    let paramIndex = 1;

    if (status) { whereConditions.push(`d.status = $${paramIndex++}`); params.push(status); }
    if (fromDate) { whereConditions.push(`d.created_at >= $${paramIndex++}`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`d.created_at <= $${paramIndex++}`); params.push(toDate); }
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM donations d ${whereClause}`, params);

    params.push(limit, offset);
    const result = await db.query(
        `SELECT d.id, d.user_id, d.amount, d.currency, d.status, d.payment_method,
                d.razorpay_payment_id, d.created_at,
                u.name as user_name, u.email as user_email, u.user_type
         FROM donations d JOIN users u ON u.id = d.user_id
         ${whereClause} ORDER BY d.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
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
    let whereConditions = [];
    let paramIndex = 1;

    if (status) { whereConditions.push(`d.status = $${paramIndex++}`); params.push(status); }
    if (fromDate) { whereConditions.push(`d.created_at >= $${paramIndex++}`); params.push(fromDate); }
    if (toDate) { whereConditions.push(`d.created_at <= $${paramIndex++}`); params.push(toDate); }
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

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
                city, organization_name, pan_number, profile_pic,
                referral_code, referral_points, created_at
         FROM users WHERE id = $1`,
        [userId]
    );
    if (userResult.rows.length === 0) throw { status: 404, message: 'User not found' };

    const donations = await db.query(
        `SELECT id, amount, status, razorpay_payment_id, created_at FROM donations WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
    );

    const referralResult = await db.query(
        `SELECT COUNT(*) as referred_count,
                (SELECT COUNT(*) FROM donations d JOIN users u ON u.id = d.user_id WHERE u.referred_by = $1 AND d.status = 'completed') as donations_from_referrals,
                (SELECT COALESCE(SUM(d.amount), 0) FROM donations d JOIN users u ON u.id = d.user_id WHERE u.referred_by = $1 AND d.status = 'completed') as amount_from_referrals
         FROM users WHERE referred_by = $1`,
        [userId]
    );

    const referredUsers = await db.query(
        `SELECT u.id, u.name, u.email, u.user_type, u.created_at,
                COALESCE(SUM(d.amount) FILTER (WHERE d.status = 'completed'), 0) as total_donated
         FROM users u LEFT JOIN donations d ON d.user_id = u.id
         WHERE u.referred_by = $1 GROUP BY u.id ORDER BY u.created_at DESC`,
        [userId]
    );

    const eventRegistrations = await db.query(
        `SELECT er.registration_status, er.created_at, e.id as event_id, e.event_name, e.event_type, e.event_date
         FROM event_registrations er JOIN events e ON e.id = er.event_id
         WHERE er.user_id = $1 ORDER BY er.created_at DESC`,
        [userId]
    );

    const certificates = await db.query(
        `SELECT cr.id, cr.pan_number, cr.status, cr.requested_at, cr.processed_at,
                d.amount as donation_amount
         FROM certificate_requests cr LEFT JOIN donations d ON d.id = cr.donation_id
         WHERE cr.user_id = $1 ORDER BY cr.requested_at DESC`,
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
const getLeaderboard = async ({ limit = 50, userType }) => {
    let query = `SELECT * FROM leaderboard`;
    const params = [];
    let paramIndex = 1;

    if (userType) {
        query += ` WHERE user_type = $${paramIndex++}`;
        params.push(userType);
    }

    // Re-order after filtering since the view might have different order
    query += ` ORDER BY score DESC LIMIT $${paramIndex}`;
    params.push(limit);

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
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];
    let paramIndex = 1;

    if (status) { whereConditions.push(`cr.status = $${paramIndex++}`); params.push(status); }
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM certificate_requests cr ${whereClause}`, params);

    params.push(limit, offset);
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
         LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
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
 * Update certificate request status
 */
const updateCertificateStatus = async (id, { status, adminNotes, certificateUrl }) => {
    const validStatuses = ['pending', 'processing', 'approved', 'rejected'];
    if (status && !validStatuses.includes(status)) {
        throw { status: 400, message: 'Invalid status' };
    }

    const result = await db.query(
        `UPDATE certificate_requests 
         SET status = COALESCE($1, status),
             admin_notes = COALESCE($2, admin_notes),
             certificate_url = COALESCE($3, certificate_url),
             processed_at = CASE WHEN $1 IN ('approved', 'rejected') THEN NOW() ELSE processed_at END
         WHERE id = $4 RETURNING *`,
        [status, adminNotes, certificateUrl, id]
    );

    if (result.rows.length === 0) throw { status: 404, message: 'Certificate request not found' };
    return result.rows[0];
};

/**
 * Get user ID by URL slug (e.g. "kamalraj-ganesan" → user ID)
 */
const getUserBySlug = async (slug) => {
    const result = await db.query(
        `SELECT id FROM users WHERE LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9 ]', '', 'g')) = LOWER(REGEXP_REPLACE($1, '-', ' ', 'g')) AND is_active = true LIMIT 1`,
        [slug]
    );
    if (result.rows.length === 0) {
        // Fallback: try ILIKE with slug converted to space-separated pattern
        const namePattern = slug.replace(/-/g, ' ');
        const fallback = await db.query(
            `SELECT id FROM users WHERE name ILIKE $1 AND is_active = true LIMIT 1`,
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
    getCertificateRequests, updateCertificateStatus,
    getUserBySlug
};
