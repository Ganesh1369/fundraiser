const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Get user profile
 */
const getProfile = async (userId) => {
    const result = await db.query(
        `SELECT u.id, u.user_type, u.name, u.age, u.email, u.phone, u.class_grade, u.school_name,
                u.address_line_1, u.address_line_2, u.area, u.city, u.state, u.pincode,
                u.organization_name, u.pan_number, u.profile_pic,
                u.referral_code, u.referral_points, u.created_at,
                cp.cin, cp.gstin, cp.csr_registration_number, cp.incorporated_year, cp.industry,
                cp.logo_url AS corp_logo_url,
                cp.authorized_signatory_name, cp.authorized_signatory_designation,
                cp.authorized_signatory_email, cp.authorized_signatory_phone
         FROM users u
         LEFT JOIN corporate_profiles cp ON cp.user_id = u.id
         WHERE u.id = ?`,
        [userId]
    );
    if (result.rows.length === 0) throw { status: 404, message: 'User not found' };

    const u = result.rows[0];
    const isOrg = u.user_type === 'organization';
    return {
        id: u.id, userType: u.user_type, name: u.name, age: u.age,
        email: u.email, phone: u.phone, classGrade: u.class_grade,
        schoolName: u.school_name,
        addressLine1: u.address_line_1, addressLine2: u.address_line_2,
        area: u.area, city: u.city, state: u.state, pincode: u.pincode,
        organizationName: u.organization_name,
        panNumber: u.pan_number, profilePic: u.profile_pic,
        referralCode: u.referral_code,
        referralPoints: u.referral_points, createdAt: u.created_at,
        corporate: isOrg ? {
            cin: u.cin,
            gstin: u.gstin,
            csrRegistrationNumber: u.csr_registration_number,
            incorporatedYear: u.incorporated_year,
            industry: u.industry,
            logoUrl: u.corp_logo_url || null,
            authorizedSignatoryName: u.authorized_signatory_name,
            authorizedSignatoryDesignation: u.authorized_signatory_designation,
            authorizedSignatoryEmail: u.authorized_signatory_email,
            authorizedSignatoryPhone: u.authorized_signatory_phone
        } : null
    };
};

/**
 * Update user profile
 */
const updateProfile = async (userId, data) => {
    const { name, age, addressLine1, addressLine2, area, city, state, pincode, schoolName, classGrade, organizationName, panNumber, userType, corporate } = data;

    // Validate userType if provided
    const validTypes = ['individual', 'student', 'organization'];
    const safeUserType = validTypes.includes(userType) ? userType : undefined;

    // Note: phone and email are not updatable by the user
    await db.query(
        `UPDATE users SET
            name = COALESCE(?, name), age = COALESCE(?, age),
            address_line_1 = COALESCE(?, address_line_1), address_line_2 = COALESCE(?, address_line_2),
            area = COALESCE(?, area), city = COALESCE(?, city),
            state = COALESCE(?, state), pincode = COALESCE(?, pincode),
            school_name = COALESCE(?, school_name), class_grade = COALESCE(?, class_grade),
            organization_name = COALESCE(?, organization_name), pan_number = COALESCE(?, pan_number),
            user_type = COALESCE(?, user_type)
         WHERE id = ?`,
        [name, age, addressLine1, addressLine2, area, city, state, pincode, schoolName, classGrade, organizationName, panNumber, safeUserType, userId]
    );

    // Corporate sidecar upsert — only for organization users
    const currentType = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    const effectiveType = currentType.rows[0]?.user_type;
    if (effectiveType === 'organization' && corporate && typeof corporate === 'object') {
        await db.query(
            `INSERT INTO corporate_profiles (
                user_id, cin, gstin, csr_registration_number, incorporated_year, industry,
                authorized_signatory_name, authorized_signatory_designation,
                authorized_signatory_email, authorized_signatory_phone
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                cin = COALESCE(VALUES(cin), cin),
                gstin = COALESCE(VALUES(gstin), gstin),
                csr_registration_number = COALESCE(VALUES(csr_registration_number), csr_registration_number),
                incorporated_year = COALESCE(VALUES(incorporated_year), incorporated_year),
                industry = COALESCE(VALUES(industry), industry),
                authorized_signatory_name = COALESCE(VALUES(authorized_signatory_name), authorized_signatory_name),
                authorized_signatory_designation = COALESCE(VALUES(authorized_signatory_designation), authorized_signatory_designation),
                authorized_signatory_email = COALESCE(VALUES(authorized_signatory_email), authorized_signatory_email),
                authorized_signatory_phone = COALESCE(VALUES(authorized_signatory_phone), authorized_signatory_phone)`,
            [
                userId,
                corporate.cin || null,
                corporate.gstin || null,
                corporate.csrRegistrationNumber || null,
                corporate.incorporatedYear || null,
                corporate.industry || null,
                corporate.authorizedSignatoryName || null,
                corporate.authorizedSignatoryDesignation || null,
                corporate.authorizedSignatoryEmail || null,
                corporate.authorizedSignatoryPhone || null
            ]
        );
    }

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
        case 'day': dateFilter = "AND d.created_at >= NOW() - INTERVAL 1 DAY"; break;
        case 'week': dateFilter = "AND d.created_at >= NOW() - INTERVAL 1 WEEK"; break;
        case 'month': dateFilter = "AND d.created_at >= NOW() - INTERVAL 1 MONTH"; break;
        case 'year': dateFilter = "AND d.created_at >= NOW() - INTERVAL 1 YEAR"; break;
    }

    const result = await db.query(
        `SELECT d.id, d.amount, d.currency, d.status, d.payment_method,
                d.razorpay_payment_id, d.created_at, d.request_80g, d.project_id,
                d.purpose, d.csr_reference_number,
                cr.id AS cert_id, cr.type AS cert_type, cr.status as certificate_status,
                cr.pdf_url AS cert_pdf_url
         FROM donations d
         LEFT JOIN certificate_requests cr ON cr.donation_id = d.id
         WHERE d.user_id = ? AND d.purpose IN ('donation','csr_donation') ${dateFilter}
         ORDER BY d.created_at DESC`,
        params
    );

    return result.rows.map(d => ({
        id: d.id, amount: parseFloat(d.amount), currency: d.currency,
        status: d.status, paymentMethod: d.payment_method,
        paymentId: d.razorpay_payment_id, createdAt: d.created_at,
        request80g: d.request_80g, projectId: d.project_id || null,
        purpose: d.purpose, csrReferenceNumber: d.csr_reference_number,
        certificateId: d.cert_id || null,
        certificateType: d.cert_type || null,
        certificateStatus: d.certificate_status || null,
        certificatePdfUrl: d.cert_pdf_url || null
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
         FROM donations WHERE user_id = ? AND purpose = 'donation'`,
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
 * CSR rollup for organization users — lifetime + current/last FY + by-project + recent receipts.
 * Returns null for non-organization users so the frontend can skip rendering.
 */
const getCsrSummary = async (userId) => {
    const userRow = await db.query(
        `SELECT u.user_type, cp.user_id AS corp_user_id
         FROM users u LEFT JOIN corporate_profiles cp ON cp.user_id = u.id
         WHERE u.id = ?`,
        [userId]
    );
    if (!userRow.rows[0] || userRow.rows[0].user_type !== 'organization') return null;

    // Indian fiscal year boundary: April 1
    const now = new Date();
    const fyStart = (yearOffset = 0) => {
        const baseYear = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
        return new Date(baseYear + yearOffset, 3, 1); // April 1
    };
    const currentFyStart = fyStart(0);
    const nextFyStart = fyStart(1);
    const lastFyStart = fyStart(-1);

    const fmtFy = (start) => {
        const startYear = start.getFullYear();
        const endTwo = String(startYear + 1).slice(-2);
        return `${startYear}-${endTwo}`;
    };

    const totals = await db.query(
        `SELECT
            COUNT(*) AS donation_count,
            COALESCE(SUM(amount), 0) AS total_amount,
            COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount ELSE 0 END), 0) AS current_fy_amount,
            COALESCE(SUM(CASE WHEN created_at >= ? AND created_at < ? THEN amount ELSE 0 END), 0) AS last_fy_amount
         FROM donations
         WHERE user_id = ? AND purpose = 'csr_donation' AND status = 'completed'`,
        [currentFyStart, nextFyStart, lastFyStart, currentFyStart, userId]
    );
    const t = totals.rows[0];

    const byProject = await db.query(
        `SELECT
            COALESCE(p.name, 'Unallocated') AS project_name,
            p.slug AS project_slug,
            SUM(d.amount) AS total_amount,
            COUNT(d.id) AS donation_count
         FROM donations d
         LEFT JOIN projects p ON p.id = d.project_id
         WHERE d.user_id = ? AND d.purpose = 'csr_donation' AND d.status = 'completed'
         GROUP BY p.id, p.name, p.slug
         ORDER BY total_amount DESC`,
        [userId]
    );

    const byFy = await db.query(
        `SELECT
            CASE WHEN MONTH(created_at) < 4 THEN YEAR(created_at) - 1 ELSE YEAR(created_at) END AS fy_start,
            SUM(amount) AS total_amount,
            COUNT(id) AS donation_count
         FROM donations
         WHERE user_id = ? AND purpose = 'csr_donation' AND status = 'completed'
         GROUP BY fy_start
         ORDER BY fy_start DESC
         LIMIT 5`,
        [userId]
    );

    const recentReceipts = await db.query(
        `SELECT d.id AS donation_id, d.amount, d.created_at, d.csr_reference_number,
                p.name AS project_name,
                cr.id AS cert_id, cr.certificate_number, cr.status AS cert_status, cr.pdf_url
         FROM donations d
         LEFT JOIN projects p ON p.id = d.project_id
         LEFT JOIN certificate_requests cr ON cr.donation_id = d.id AND cr.type = 'csr_receipt'
         WHERE d.user_id = ? AND d.purpose = 'csr_donation' AND d.status = 'completed'
         ORDER BY d.created_at DESC
         LIMIT 5`,
        [userId]
    );

    return {
        totalAmount: parseFloat(t.total_amount),
        donationCount: Number(t.donation_count),
        currentFy: {
            label: fmtFy(currentFyStart),
            amount: parseFloat(t.current_fy_amount)
        },
        lastFy: {
            label: fmtFy(lastFyStart),
            amount: parseFloat(t.last_fy_amount)
        },
        byProject: byProject.rows.map(r => ({
            projectName: r.project_name,
            projectSlug: r.project_slug || null,
            totalAmount: parseFloat(r.total_amount),
            donationCount: Number(r.donation_count)
        })),
        byFy: byFy.rows.map(r => {
            const startYear = Number(r.fy_start);
            const endTwo = String(startYear + 1).slice(-2);
            return {
                label: `${startYear}-${endTwo}`,
                totalAmount: parseFloat(r.total_amount),
                donationCount: Number(r.donation_count)
            };
        }),
        recentReceipts: recentReceipts.rows.map(r => ({
            donationId: r.donation_id,
            amount: parseFloat(r.amount),
            createdAt: r.created_at,
            csrReferenceNumber: r.csr_reference_number,
            projectName: r.project_name,
            certificateId: r.cert_id,
            certificateNumber: r.certificate_number,
            certificateStatus: r.cert_status,
            pdfUrl: r.pdf_url
        }))
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
    if (!donationId) throw { status: 400, message: 'Please select a donation for the 80G certificate' };

    const donationCheck = await db.query(
        `SELECT id FROM donations WHERE id = ? AND user_id = ? AND status = 'completed' AND purpose = 'donation'`,
        [donationId, userId]
    );
    if (donationCheck.rows.length === 0) throw { status: 400, message: 'Invalid donation' };

    // Check if certificate already exists for this donation
    const existingCert = await db.query(
        'SELECT id FROM certificate_requests WHERE donation_id = ?',
        [donationId]
    );
    if (existingCert.rows.length > 0) throw { status: 400, message: '80G certificate already requested for this donation' };

    const certId = uuidv4();
    await db.query(
        `INSERT INTO certificate_requests (id, user_id, donation_id, pan_number)
         VALUES (?, ?, ?, ?)`,
        [certId, userId, donationId, panNumber.toUpperCase()]
    );
    const result = await db.query('SELECT id, status, requested_at FROM certificate_requests WHERE id = ?', [certId]);
    return result.rows[0];
};

/**
 * Get certificate requests for a user
 */
const getCertificateRequests = async (userId) => {
    const result = await db.query(
        `SELECT cr.id, cr.donation_id, cr.pan_number, cr.status,
                cr.certificate_number, cr.pdf_url, cr.auto_generated, cr.issued_at,
                cr.requested_at, cr.processed_at,
                d.amount as donation_amount, d.created_at as donation_date
         FROM certificate_requests cr
         LEFT JOIN donations d ON d.id = cr.donation_id
         WHERE cr.user_id = ?
         ORDER BY cr.requested_at DESC`,
        [userId]
    );
    return result.rows.map(r => ({
        id: r.id, panNumber: r.pan_number, status: r.status,
        certificateNumber: r.certificate_number || null,
        pdfUrl: r.pdf_url || null,
        autoGenerated: !!r.auto_generated,
        issuedAt: r.issued_at,
        requestedAt: r.requested_at, processedAt: r.processed_at,
        donationAmount: r.donation_amount ? parseFloat(r.donation_amount) : null,
        donationDate: r.donation_date,
        donationId: r.donation_id || null
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
 * Per-org FY CSR rollup xlsx — same shape as the admin grand total file
 * but scoped to one organization. Throws 403 if the user isn't an org.
 */
const exportCsrRollupForUser = async (userId, fy) => {
    const xlsx = require('xlsx');
    const { fyRangeFromLabel } = require('./admin.service');
    const { startDate, endDate, label } = fyRangeFromLabel(fy);

    const userRow = await db.query(
        `SELECT u.user_type, COALESCE(NULLIF(u.organization_name, ''), u.name) AS org_name
         FROM users u WHERE u.id = ?`,
        [userId]
    );
    if (!userRow.rows[0]) throw { status: 404, message: 'User not found' };
    if (userRow.rows[0].user_type !== 'organization') {
        throw { status: 403, message: 'CSR rollup is for organization accounts only' };
    }

    const result = await db.query(
        `SELECT d.id AS donation_id, d.amount, d.created_at AS donation_date,
                d.razorpay_payment_id, d.csr_reference_number,
                p.name AS project_name,
                cr.certificate_number AS receipt_number,
                cr.status AS receipt_status,
                cr.issued_at AS receipt_issued_at
         FROM donations d
         LEFT JOIN projects p ON p.id = d.project_id
         LEFT JOIN certificate_requests cr ON cr.donation_id = d.id AND cr.type = 'csr_receipt'
         WHERE d.user_id = ?
           AND d.purpose = 'csr_donation'
           AND d.status = 'completed'
           AND d.created_at >= ? AND d.created_at < ?
         ORDER BY d.created_at`,
        [userId, startDate, endDate]
    );

    const rows = result.rows.map(r => ({
        'Donation Date': r.donation_date,
        'Project': r.project_name || '',
        'Amount (INR)': parseFloat(r.amount),
        'Payment ID': r.razorpay_payment_id || '',
        'CSR Reference': r.csr_reference_number || '',
        'Receipt #': r.receipt_number || '',
        'Receipt Status': r.receipt_status || '',
        'Receipt Issued At': r.receipt_issued_at || ''
    }));

    const total = result.rows.reduce((acc, r) => acc + parseFloat(r.amount), 0);
    rows.push({
        'Donation Date': '',
        'Project': `TOTAL — FY ${label}`,
        'Amount (INR)': total,
        'Payment ID': '',
        'CSR Reference': '',
        'Receipt #': '',
        'Receipt Status': `${result.rows.length} donation${result.rows.length === 1 ? '' : 's'}`,
        'Receipt Issued At': ''
    });

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, `CSR ${label}`);
    return {
        buffer: xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
        label,
        orgName: userRow.rows[0].org_name
    };
};

/**
 * Update profile picture path
 */
const updateProfilePic = async (userId, profilePic) => {
    await db.query('UPDATE users SET profile_pic = ? WHERE id = ?', [profilePic, userId]);
};

/**
 * Set the corporate logo URL — organization users only. Upserts the
 * corporate_profiles row so freshly converted org users without a sidecar
 * still get a logo persisted.
 */
const updateCorporateLogo = async (userId, logoUrl) => {
    const userRow = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!userRow.rows[0]) throw { status: 404, message: 'User not found' };
    if (userRow.rows[0].user_type !== 'organization') {
        throw { status: 403, message: 'Logo upload is for organization accounts only' };
    }
    await db.query(
        `INSERT INTO corporate_profiles (user_id, logo_url) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE logo_url = VALUES(logo_url)`,
        [userId, logoUrl]
    );
};

const getCorporateLogo = async (userId) => {
    const r = await db.query('SELECT logo_url FROM corporate_profiles WHERE user_id = ?', [userId]);
    return r.rows[0]?.logo_url || null;
};

module.exports = {
    getProfile, updateProfile, updateProfilePic, getDonations, getDonationSummary,
    getCsrSummary,
    exportCsrRollupForUser,
    updateCorporateLogo, getCorporateLogo,
    getReferrals, getReferralPointsHistory, requestCertificate, getCertificateRequests,
    getUserEvents
};
