const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

/**
 * Phase 2.2 — multi-tranche CSR pledges.
 * A commitment header + scheduled tranches; each tranche links to a donations
 * row once paid. Receipts are issued per tranche via the existing pipeline.
 */

/**
 * Resolve org user_id from an admin-supplied identifier (id, email, or PAN).
 * Throws 404 if no organization user matches.
 */
const resolveOrgUserId = async ({ userId, email, pan }) => {
    if (userId) {
        const r = await db.query(
            `SELECT id FROM users WHERE id = ? AND user_type = 'organization' LIMIT 1`,
            [userId]
        );
        if (r.rows[0]) return r.rows[0].id;
    }
    if (email) {
        const r = await db.query(
            `SELECT id FROM users WHERE email = ? AND user_type = 'organization' LIMIT 1`,
            [email]
        );
        if (r.rows[0]) return r.rows[0].id;
    }
    if (pan) {
        const r = await db.query(
            `SELECT id FROM users WHERE pan_number = ? AND user_type = 'organization' LIMIT 1`,
            [pan]
        );
        if (r.rows[0]) return r.rows[0].id;
    }
    throw { status: 404, message: 'Organization user not found (provide userId, email, or PAN)' };
};

/**
 * Create a commitment + tranche schedule.
 * tranches: [{ planned_amount, planned_date }] — sequence is assigned in order.
 */
const createCommitment = async (adminId, body) => {
    const {
        userId, email, pan,
        projectId, totalAmount, currency, periodLabel, notes,
        tranches
    } = body;

    if (!totalAmount || Number(totalAmount) <= 0) {
        throw { status: 400, message: 'totalAmount must be a positive number' };
    }
    if (!Array.isArray(tranches) || tranches.length === 0) {
        throw { status: 400, message: 'tranches must be a non-empty array' };
    }
    const tranchesSum = tranches.reduce((acc, t) => acc + Number(t.planned_amount || t.plannedAmount || 0), 0);
    if (Math.abs(tranchesSum - Number(totalAmount)) > 0.5) {
        throw { status: 400, message: `Tranche planned amounts (${tranchesSum}) must sum to totalAmount (${totalAmount})` };
    }

    const orgUserId = await resolveOrgUserId({ userId, email, pan });

    const commitmentId = uuidv4();
    const conn = await db.getClient();
    try {
        await conn.query('START TRANSACTION');
        await conn.query(
            `INSERT INTO csr_commitments
                (id, user_id, project_id, total_amount, currency, period_label, notes, status, created_by_admin_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
            [
                commitmentId, orgUserId, projectId || null, totalAmount,
                currency || 'INR', periodLabel || null, notes || null, adminId || null
            ]
        );

        for (let i = 0; i < tranches.length; i++) {
            const t = tranches[i];
            await conn.query(
                `INSERT INTO csr_commitment_tranches
                    (id, commitment_id, sequence, planned_amount, planned_date, status, notes)
                 VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`,
                [
                    uuidv4(), commitmentId, i + 1,
                    t.planned_amount ?? t.plannedAmount,
                    t.planned_date ?? t.plannedDate ?? null,
                    t.notes ?? null
                ]
            );
        }
        await conn.query('COMMIT');
    } catch (err) {
        await conn.query('ROLLBACK');
        throw err;
    } finally {
        conn.release();
    }

    return getCommitmentById(commitmentId);
};

const getCommitmentById = async (id) => {
    const header = await db.query(
        `SELECT c.id, c.user_id, c.project_id, c.total_amount, c.currency, c.period_label,
                c.notes, c.status, c.created_at, c.updated_at,
                COALESCE(NULLIF(u.organization_name, ''), u.name) AS org_name,
                u.email AS org_email,
                p.name AS project_name, p.slug AS project_slug
         FROM csr_commitments c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN projects p ON p.id = c.project_id
         WHERE c.id = ?`,
        [id]
    );
    if (!header.rows[0]) throw { status: 404, message: 'Commitment not found' };

    const tranches = await db.query(
        `SELECT t.id, t.sequence, t.planned_amount, t.planned_date,
                t.donation_id, t.status, t.paid_at, t.notes,
                d.amount AS donation_amount, d.razorpay_payment_id, d.csr_reference_number,
                cr.id AS receipt_id, cr.certificate_number AS receipt_number,
                cr.status AS receipt_status, cr.pdf_url AS receipt_pdf_url
         FROM csr_commitment_tranches t
         LEFT JOIN donations d ON d.id = t.donation_id
         LEFT JOIN certificate_requests cr ON cr.donation_id = t.donation_id AND cr.type = 'csr_receipt'
         WHERE t.commitment_id = ?
         ORDER BY t.sequence`,
        [id]
    );

    const paidTotal = tranches.rows
        .filter(t => t.status === 'paid')
        .reduce((acc, t) => acc + parseFloat(t.donation_amount || t.planned_amount), 0);

    return {
        id: header.rows[0].id,
        orgName: header.rows[0].org_name,
        orgEmail: header.rows[0].org_email,
        userId: header.rows[0].user_id,
        projectId: header.rows[0].project_id,
        projectName: header.rows[0].project_name,
        projectSlug: header.rows[0].project_slug,
        totalAmount: parseFloat(header.rows[0].total_amount),
        paidAmount: paidTotal,
        remainingAmount: parseFloat(header.rows[0].total_amount) - paidTotal,
        currency: header.rows[0].currency,
        periodLabel: header.rows[0].period_label,
        notes: header.rows[0].notes,
        status: header.rows[0].status,
        createdAt: header.rows[0].created_at,
        updatedAt: header.rows[0].updated_at,
        tranches: tranches.rows.map(t => ({
            id: t.id,
            sequence: t.sequence,
            plannedAmount: parseFloat(t.planned_amount),
            plannedDate: t.planned_date,
            status: t.status,
            donationId: t.donation_id,
            donationAmount: t.donation_amount ? parseFloat(t.donation_amount) : null,
            paymentId: t.razorpay_payment_id || null,
            csrReferenceNumber: t.csr_reference_number || null,
            receiptId: t.receipt_id || null,
            receiptNumber: t.receipt_number || null,
            receiptStatus: t.receipt_status || null,
            receiptPdfUrl: t.receipt_pdf_url || null,
            paidAt: t.paid_at,
            notes: t.notes
        }))
    };
};

const listCommitments = async ({ userId, status, page = 1, limit = 20 }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    if (userId) { where.push('c.user_id = ?'); params.push(userId); }
    if (status) { where.push('c.status = ?'); params.push(status); }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = await db.query(
        `SELECT COUNT(*) AS count FROM csr_commitments c ${whereClause}`,
        params
    );

    const result = await db.query(
        `SELECT c.id, c.user_id, c.total_amount, c.currency, c.period_label, c.status,
                c.created_at,
                COALESCE(NULLIF(u.organization_name, ''), u.name) AS org_name,
                p.name AS project_name,
                COALESCE(SUM(CASE WHEN t.status = 'paid' THEN COALESCE(d.amount, t.planned_amount) ELSE 0 END), 0) AS paid_amount,
                COUNT(t.id) AS tranche_count,
                SUM(CASE WHEN t.status = 'paid' THEN 1 ELSE 0 END) AS paid_count
         FROM csr_commitments c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN projects p ON p.id = c.project_id
         LEFT JOIN csr_commitment_tranches t ON t.commitment_id = c.id
         LEFT JOIN donations d ON d.id = t.donation_id
         ${whereClause}
         GROUP BY c.id, c.user_id, c.total_amount, c.currency, c.period_label, c.status, c.created_at,
                  u.organization_name, u.name, p.name
         ORDER BY c.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return {
        commitments: result.rows.map(r => ({
            id: r.id,
            userId: r.user_id,
            orgName: r.org_name,
            projectName: r.project_name,
            totalAmount: parseFloat(r.total_amount),
            paidAmount: parseFloat(r.paid_amount),
            remainingAmount: parseFloat(r.total_amount) - parseFloat(r.paid_amount),
            currency: r.currency,
            periodLabel: r.period_label,
            status: r.status,
            trancheCount: Number(r.tranche_count),
            paidCount: Number(r.paid_count),
            createdAt: r.created_at
        })),
        pagination: {
            total: parseInt(countRow.rows[0].count),
            page, limit,
            totalPages: Math.ceil(countRow.rows[0].count / limit)
        }
    };
};

/**
 * Mark a tranche paid against an existing donation row. The donation must
 * belong to the same org user as the commitment, be of purpose='csr_donation',
 * and not already linked to another tranche.
 */
const markTranchePaid = async (commitmentId, trancheId, { donationId }) => {
    if (!donationId) throw { status: 400, message: 'donationId is required' };

    const tranche = await db.query(
        `SELECT t.id, t.status, t.commitment_id, c.user_id AS commitment_user_id
         FROM csr_commitment_tranches t
         JOIN csr_commitments c ON c.id = t.commitment_id
         WHERE t.id = ? AND t.commitment_id = ?`,
        [trancheId, commitmentId]
    );
    if (!tranche.rows[0]) throw { status: 404, message: 'Tranche not found' };
    if (tranche.rows[0].status === 'paid') throw { status: 400, message: 'Tranche already marked paid' };

    const donation = await db.query(
        `SELECT id, user_id, purpose FROM donations WHERE id = ?`,
        [donationId]
    );
    if (!donation.rows[0]) throw { status: 404, message: 'Donation not found' };
    if (donation.rows[0].user_id !== tranche.rows[0].commitment_user_id) {
        throw { status: 400, message: 'Donation belongs to a different user than the commitment' };
    }
    if (donation.rows[0].purpose !== 'csr_donation') {
        throw { status: 400, message: 'Donation must be of purpose csr_donation' };
    }

    const existingLink = await db.query(
        `SELECT id FROM csr_commitment_tranches WHERE donation_id = ? AND id != ?`,
        [donationId, trancheId]
    );
    if (existingLink.rows[0]) throw { status: 400, message: 'Donation is already linked to another tranche' };

    await db.query(
        `UPDATE csr_commitment_tranches
            SET status = 'paid', donation_id = ?, paid_at = NOW()
          WHERE id = ?`,
        [donationId, trancheId]
    );

    // If all tranches paid, mark the commitment completed.
    const remaining = await db.query(
        `SELECT COUNT(*) AS count FROM csr_commitment_tranches
          WHERE commitment_id = ? AND status NOT IN ('paid','skipped')`,
        [commitmentId]
    );
    if (Number(remaining.rows[0].count) === 0) {
        await db.query(
            `UPDATE csr_commitments SET status = 'completed' WHERE id = ?`,
            [commitmentId]
        );
    }

    return getCommitmentById(commitmentId);
};

/**
 * Per-org view: all commitments for the calling org user, with tranche detail.
 * Drives the corporate dashboard pledge-vs-paid block.
 */
const getCommitmentsForUser = async (userId) => {
    const headers = await db.query(
        `SELECT c.id FROM csr_commitments c
         WHERE c.user_id = ?
         ORDER BY c.created_at DESC
         LIMIT 50`,
        [userId]
    );
    const out = [];
    for (const h of headers.rows) {
        out.push(await getCommitmentById(h.id));
    }
    return out;
};

module.exports = {
    createCommitment,
    getCommitmentById,
    listCommitments,
    markTranchePaid,
    getCommitmentsForUser
};
