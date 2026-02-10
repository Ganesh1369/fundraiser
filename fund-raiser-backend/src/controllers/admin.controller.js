const xlsx = require('xlsx');
const db = require('../config/db');

// Get dashboard statistics
exports.getDashboardStats = async (req, res, next) => {
    try {
        // Get total users by type
        const userStats = await db.query(
            `SELECT user_type, COUNT(*) as count FROM users WHERE is_active = true GROUP BY user_type`
        );

        // Get donation stats
        const donationStats = await db.query(
            `SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_amount,
                COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 month'), 0) as this_month,
                COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) as this_week
             FROM donations`
        );

        // Get certificate stats
        const certStats = await db.query(
            `SELECT status, COUNT(*) as count FROM certificate_requests GROUP BY status`
        );

        // Get recent registrations count
        const recentUsers = await db.query(
            `SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`
        );

        const usersByType = {};
        userStats.rows.forEach(row => {
            usersByType[row.user_type] = parseInt(row.count);
        });

        const certsByStatus = {};
        certStats.rows.forEach(row => {
            certsByStatus[row.status] = parseInt(row.count);
        });

        res.json({
            success: true,
            data: {
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
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get registrations with filters
exports.getRegistrations = async (req, res, next) => {
    try {
        const { userType, fromDate, toDate, page = 1, limit = 20, search } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let whereConditions = ['is_active = true'];
        let paramIndex = 1;

        if (userType) {
            whereConditions.push(`user_type = $${paramIndex++}`);
            params.push(userType);
        }

        if (fromDate) {
            whereConditions.push(`created_at >= $${paramIndex++}`);
            params.push(fromDate);
        }

        if (toDate) {
            whereConditions.push(`created_at <= $${paramIndex++}`);
            params.push(toDate);
        }

        if (search) {
            whereConditions.push(`(name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM users ${whereClause}`,
            params
        );

        // Get paginated results
        params.push(limit, offset);
        const result = await db.query(
            `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                    area, locality, city, organization_name, referral_code, 
                    referral_points, created_at
             FROM users ${whereClause}
             ORDER BY created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            params
        );

        res.json({
            success: true,
            data: {
                registrations: result.rows,
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Export registrations to Excel
exports.exportRegistrations = async (req, res, next) => {
    try {
        const { userType, fromDate, toDate } = req.query;
        const params = [];
        let whereConditions = ['is_active = true'];
        let paramIndex = 1;

        if (userType) {
            whereConditions.push(`user_type = $${paramIndex++}`);
            params.push(userType);
        }

        if (fromDate) {
            whereConditions.push(`created_at >= $${paramIndex++}`);
            params.push(fromDate);
        }

        if (toDate) {
            whereConditions.push(`created_at <= $${paramIndex++}`);
            params.push(toDate);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const result = await db.query(
            `SELECT user_type as "User Type", name as "Name", age as "Age", 
                    email as "Email", phone as "Phone", class_grade as "Class/Grade",
                    school_name as "School Name", area as "Area", locality as "Locality",
                    city as "City", organization_name as "Organization", 
                    referral_code as "Referral Code", referral_points as "Points",
                    created_at as "Registered At"
             FROM users ${whereClause}
             ORDER BY created_at DESC`,
            params
        );

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Registrations');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=registrations.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        next(error);
    }
};

// Get donations with filters
exports.getDonations = async (req, res, next) => {
    try {
        const { status, fromDate, toDate, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let whereConditions = [];
        let paramIndex = 1;

        if (status) {
            whereConditions.push(`d.status = $${paramIndex++}`);
            params.push(status);
        }

        if (fromDate) {
            whereConditions.push(`d.created_at >= $${paramIndex++}`);
            params.push(fromDate);
        }

        if (toDate) {
            whereConditions.push(`d.created_at <= $${paramIndex++}`);
            params.push(toDate);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM donations d ${whereClause}`,
            params
        );

        // Get paginated results
        params.push(limit, offset);
        const result = await db.query(
            `SELECT d.id, d.amount, d.currency, d.status, d.payment_method,
                    d.razorpay_payment_id, d.created_at,
                    u.name as user_name, u.email as user_email, u.user_type
             FROM donations d
             JOIN users u ON u.id = d.user_id
             ${whereClause}
             ORDER BY d.created_at DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            params
        );

        res.json({
            success: true,
            data: {
                donations: result.rows.map(d => ({
                    ...d,
                    amount: parseFloat(d.amount)
                })),
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Export donations to Excel
exports.exportDonations = async (req, res, next) => {
    try {
        const { status, fromDate, toDate } = req.query;
        const params = [];
        let whereConditions = [];
        let paramIndex = 1;

        if (status) {
            whereConditions.push(`d.status = $${paramIndex++}`);
            params.push(status);
        }

        if (fromDate) {
            whereConditions.push(`d.created_at >= $${paramIndex++}`);
            params.push(fromDate);
        }

        if (toDate) {
            whereConditions.push(`d.created_at <= $${paramIndex++}`);
            params.push(toDate);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const result = await db.query(
            `SELECT d.amount as "Amount", d.currency as "Currency", d.status as "Status",
                    d.payment_method as "Payment Method", d.razorpay_payment_id as "Payment ID",
                    u.name as "Donor Name", u.email as "Email", u.user_type as "User Type",
                    d.created_at as "Date"
             FROM donations d
             JOIN users u ON u.id = d.user_id
             ${whereClause}
             ORDER BY d.created_at DESC`,
            params
        );

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Donations');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=donations.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        next(error);
    }
};

// Get individual user analytics
exports.getUserAnalytics = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Get user details
        const userResult = await db.query(
            `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                    area, locality, city, organization_name, pan_number,
                    referral_code, referral_points, created_at
             FROM users WHERE id = $1`,
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get donation history
        const donations = await db.query(
            `SELECT id, amount, status, created_at
             FROM donations WHERE user_id = $1
             ORDER BY created_at DESC`,
            [id]
        );

        // Get referral metrics
        const referralResult = await db.query(
            `SELECT COUNT(*) as referred_count,
                    (SELECT COUNT(*) FROM donations d 
                     JOIN users u ON u.id = d.user_id 
                     WHERE u.referred_by = $1 AND d.status = 'completed') as donations_from_referrals,
                    (SELECT COALESCE(SUM(d.amount), 0) FROM donations d 
                     JOIN users u ON u.id = d.user_id 
                     WHERE u.referred_by = $1 AND d.status = 'completed') as amount_from_referrals
             FROM users WHERE referred_by = $1`,
            [id]
        );

        const user = userResult.rows[0];
        const referralStats = referralResult.rows[0];

        res.json({
            success: true,
            data: {
                user: user,
                donations: {
                    history: donations.rows.map(d => ({
                        ...d,
                        amount: parseFloat(d.amount)
                    })),
                    totalAmount: donations.rows
                        .filter(d => d.status === 'completed')
                        .reduce((sum, d) => sum + parseFloat(d.amount), 0),
                    count: donations.rows.length
                },
                referrals: {
                    count: parseInt(referralStats.referred_count),
                    donationsGenerated: parseInt(referralStats.donations_from_referrals),
                    amountGenerated: parseFloat(referralStats.amount_from_referrals),
                    points: user.referral_points
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get leaderboard
exports.getLeaderboard = async (req, res, next) => {
    try {
        const { limit = 50 } = req.query;

        const result = await db.query(
            `SELECT * FROM leaderboard LIMIT $1`,
            [limit]
        );

        res.json({
            success: true,
            data: result.rows.map((row, index) => ({
                rank: index + 1,
                id: row.id,
                name: row.name,
                userType: row.user_type,
                totalDonations: parseFloat(row.total_donations),
                referralPoints: parseInt(row.referral_points),
                score: parseFloat(row.score)
            }))
        });

    } catch (error) {
        next(error);
    }
};

// Export leaderboard to Excel
exports.exportLeaderboard = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT name as "Name", user_type as "User Type",
                    total_donations as "Total Donations (₹)", 
                    referral_points as "Referral Points",
                    score as "Total Score"
             FROM leaderboard`
        );

        // Add rank
        const dataWithRank = result.rows.map((row, index) => ({
            'Rank': index + 1,
            ...row
        }));

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(dataWithRank);
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Leaderboard');

        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename=leaderboard.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        next(error);
    }
};

// Get certificate requests
exports.getCertificateRequests = async (req, res, next) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let whereConditions = [];
        let paramIndex = 1;

        if (status) {
            whereConditions.push(`cr.status = $${paramIndex++}`);
            params.push(status);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Get total count
        const countResult = await db.query(
            `SELECT COUNT(*) FROM certificate_requests cr ${whereClause}`,
            params
        );

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

        res.json({
            success: true,
            data: {
                requests: result.rows.map(r => ({
                    ...r,
                    donation_amount: r.donation_amount ? parseFloat(r.donation_amount) : null
                })),
                pagination: {
                    total: parseInt(countResult.rows[0].count),
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(countResult.rows[0].count / limit)
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// Update certificate request status
exports.updateCertificateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, adminNotes, certificateUrl } = req.body;

        const validStatuses = ['pending', 'processing', 'approved', 'rejected'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const result = await db.query(
            `UPDATE certificate_requests 
             SET status = COALESCE($1, status),
                 admin_notes = COALESCE($2, admin_notes),
                 certificate_url = COALESCE($3, certificate_url),
                 processed_at = CASE WHEN $1 IN ('approved', 'rejected') THEN NOW() ELSE processed_at END
             WHERE id = $4
             RETURNING *`,
            [status, adminNotes, certificateUrl, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Certificate request not found'
            });
        }

        res.json({
            success: true,
            message: 'Certificate request updated',
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};
