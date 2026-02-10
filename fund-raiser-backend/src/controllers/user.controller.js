const db = require('../config/db');

// Get user profile
exports.getProfile = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT id, user_type, name, age, email, phone, class_grade, school_name,
                    area, locality, city, organization_name, pan_number,
                    referral_code, referral_points, created_at
             FROM users WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                id: user.id,
                userType: user.user_type,
                name: user.name,
                age: user.age,
                email: user.email,
                phone: user.phone,
                classGrade: user.class_grade,
                schoolName: user.school_name,
                area: user.area,
                locality: user.locality,
                city: user.city,
                organizationName: user.organization_name,
                panNumber: user.pan_number,
                referralCode: user.referral_code,
                referralPoints: user.referral_points,
                createdAt: user.created_at
            }
        });

    } catch (error) {
        next(error);
    }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
    try {
        const { name, age, phone, area, locality, city, schoolName, classGrade } = req.body;

        const result = await db.query(
            `UPDATE users SET 
                name = COALESCE($1, name),
                age = COALESCE($2, age),
                phone = COALESCE($3, phone),
                area = COALESCE($4, area),
                locality = COALESCE($5, locality),
                city = COALESCE($6, city),
                school_name = COALESCE($7, school_name),
                class_grade = COALESCE($8, class_grade)
             WHERE id = $9
             RETURNING id, name, email`,
            [name, age, phone, area, locality, city, schoolName, classGrade, req.user.id]
        );

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// Get user donations with filters
exports.getDonations = async (req, res, next) => {
    try {
        const { period } = req.query;

        let dateFilter = '';
        const params = [req.user.id];

        switch (period) {
            case 'day':
                dateFilter = "AND created_at >= NOW() - INTERVAL '1 day'";
                break;
            case 'week':
                dateFilter = "AND created_at >= NOW() - INTERVAL '1 week'";
                break;
            case 'month':
                dateFilter = "AND created_at >= NOW() - INTERVAL '1 month'";
                break;
            case 'year':
                dateFilter = "AND created_at >= NOW() - INTERVAL '1 year'";
                break;
            default:
                dateFilter = '';
        }

        const result = await db.query(
            `SELECT id, amount, currency, status, payment_method, 
                    razorpay_payment_id, created_at
             FROM donations 
             WHERE user_id = $1 ${dateFilter}
             ORDER BY created_at DESC`,
            params
        );

        console.log(`[DEBUG] getDonations - User: ${req.user.id}, Filter: ${period || 'none'}, Rows: ${result.rows.length}`);

        res.json({
            success: true,
            data: result.rows.map(d => ({
                id: d.id,
                amount: parseFloat(d.amount),
                currency: d.currency,
                status: d.status,
                paymentMethod: d.payment_method,
                paymentId: d.razorpay_payment_id,
                createdAt: d.created_at
            }))
        });

    } catch (error) {
        next(error);
    }
};

// Get donation summary
exports.getDonationSummary = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT 
                COUNT(*) as total_count,
                COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) as total_amount,
                COALESCE(SUM(amount) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '1 month'), 0) as this_month
             FROM donations WHERE user_id = $1`,
            [req.user.id]
        );

        const summary = result.rows[0];

        res.json({
            success: true,
            data: {
                totalDonations: parseInt(summary.total_count),
                totalAmount: parseFloat(summary.total_amount),
                thisMonthAmount: parseFloat(summary.this_month)
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get referral statistics
exports.getReferrals = async (req, res, next) => {
    try {
        // Get referral count and points
        const statsResult = await db.query(
            `SELECT 
                u.referral_points,
                COUNT(r.id) as referral_count
             FROM users u
             LEFT JOIN users r ON r.referred_by = u.id
             WHERE u.id = $1
             GROUP BY u.id, u.referral_points`,
            [req.user.id]
        );

        // Get referred users list
        const referredResult = await db.query(
            `SELECT name, created_at
             FROM users WHERE referred_by = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [req.user.id]
        );

        const stats = statsResult.rows[0] || { referral_points: 0, referral_count: 0 };

        res.json({
            success: true,
            data: {
                referralPoints: parseInt(stats.referral_points),
                referralCount: parseInt(stats.referral_count),
                referralCode: req.user.referral_code,
                referralLink: `${process.env.FRONTEND_URL}/register?ref=${req.user.referral_code}`,
                recentReferrals: referredResult.rows
            }
        });

    } catch (error) {
        next(error);
    }
};

// Get referral points history
exports.getReferralPointsHistory = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT rph.points_earned, rph.donor_name, rph.created_at,
                    d.amount as donation_amount
             FROM referral_points_history rph
             JOIN donations d ON d.id = rph.donation_id
             WHERE rph.user_id = $1
             ORDER BY rph.created_at DESC
             LIMIT 50`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: result.rows.map(r => ({
                pointsEarned: r.points_earned,
                donorName: r.donor_name,
                donationAmount: parseFloat(r.donation_amount),
                createdAt: r.created_at
            }))
        });

    } catch (error) {
        next(error);
    }
};

// Request 80G certificate
exports.requestCertificate = async (req, res, next) => {
    try {
        const { panNumber, donationId } = req.body;

        if (!panNumber) {
            return res.status(400).json({
                success: false,
                message: 'PAN number is required'
            });
        }

        // Verify donation belongs to user if specified
        if (donationId) {
            const donationCheck = await db.query(
                'SELECT id FROM donations WHERE id = $1 AND user_id = $2 AND status = $3',
                [donationId, req.user.id, 'completed']
            );

            if (donationCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid donation'
                });
            }
        }

        const result = await db.query(
            `INSERT INTO certificate_requests (user_id, donation_id, pan_number)
             VALUES ($1, $2, $3)
             RETURNING id, status, requested_at`,
            [req.user.id, donationId || null, panNumber.toUpperCase()]
        );

        res.status(201).json({
            success: true,
            message: 'Certificate request submitted successfully',
            data: result.rows[0]
        });

    } catch (error) {
        next(error);
    }
};

// Get certificate requests
exports.getCertificateRequests = async (req, res, next) => {
    try {
        const result = await db.query(
            `SELECT cr.id, cr.pan_number, cr.status, cr.requested_at, cr.processed_at,
                    d.amount as donation_amount, d.created_at as donation_date
             FROM certificate_requests cr
             LEFT JOIN donations d ON d.id = cr.donation_id
             WHERE cr.user_id = $1
             ORDER BY cr.requested_at DESC`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: result.rows.map(r => ({
                id: r.id,
                panNumber: r.pan_number,
                status: r.status,
                requestedAt: r.requested_at,
                processedAt: r.processed_at,
                donationAmount: r.donation_amount ? parseFloat(r.donation_amount) : null,
                donationDate: r.donation_date
            }))
        });

    } catch (error) {
        next(error);
    }
};

// Subscribe to push notifications
exports.subscribePush = async (req, res, next) => {
    try {
        const { endpoint, keys } = req.body;

        if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription data'
            });
        }

        // Upsert subscription
        await db.query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id) DO UPDATE SET
                endpoint = EXCLUDED.endpoint,
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth`,
            [req.user.id, endpoint, keys.p256dh, keys.auth]
        );

        res.json({
            success: true,
            message: 'Push subscription saved'
        });

    } catch (error) {
        next(error);
    }
};
