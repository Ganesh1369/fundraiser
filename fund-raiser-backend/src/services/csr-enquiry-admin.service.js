const db = require('../config/db');
const emailSvc = require('./csr-enquiry-email.service');

/**
 * Admin-side CSR enquiry module: pipeline workflow, notes, documents, milestones,
 * audit log, metrics and reporting.
 */

// ── Workflow ─────────────────────────────────────────────────────────────────

/**
 * The 13 stages, in pipeline order.
 *
 * The scope named only the first and last ("New Enquiry → Closed/Renewal"); the rest are a
 * standard CSR partnership pipeline and are pending client confirmation. Stored as slugs,
 * so relabelling is a change here alone — no data migration.
 *
 * `open: false` marks the terminal stages, which the "active partnerships" metric excludes.
 */
const STATUSES = [
    { key: 'new_enquiry',      label: 'New Enquiry',       group: 'Intake',         open: true },
    { key: 'acknowledged',     label: 'Acknowledged',      group: 'Intake',         open: true },
    { key: 'qualified',        label: 'Qualified',         group: 'Intake',         open: true },
    { key: 'proposal_shared',  label: 'Proposal Shared',   group: 'Proposal',       open: true },
    { key: 'under_review',     label: 'Under Review',      group: 'Proposal',       open: true },
    { key: 'negotiation',      label: 'Negotiation',       group: 'Proposal',       open: true },
    { key: 'approved',         label: 'Approved',          group: 'Commitment',     open: true },
    { key: 'mou_signed',       label: 'MoU Signed',        group: 'Commitment',     open: true },
    { key: 'funds_awaited',    label: 'Funds Awaited',     group: 'Commitment',     open: true },
    { key: 'funds_received',   label: 'Funds Received',    group: 'Delivery',       open: true },
    { key: 'implementation',   label: 'Implementation',    group: 'Delivery',       open: true },
    { key: 'impact_reporting', label: 'Impact Reporting',  group: 'Delivery',       open: true },
    { key: 'closed_renewal',   label: 'Closed / Renewal',  group: 'Closed',         open: false },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.key, s]));
const statusLabel = (key) => STATUS_MAP[key]?.label || key;

// ── Audit log ────────────────────────────────────────────────────────────────

const actorName = (admin) => admin?.name || admin?.username || 'System';

/**
 * Append to the immutable activity log. Never throws into the caller's path — losing an
 * audit line must not fail the action it describes, but it must be visible in the log.
 */
const logActivity = async (enquiryId, admin, action, summary, from = null, to = null) => {
    try {
        await db.query(
            `INSERT INTO csr_enquiry_activity_log
                (enquiry_id, admin_id, actor_name, action, summary, from_value, to_value)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [enquiryId, admin?.id || null, actorName(admin), action, summary, from, to]
        );
    } catch (err) {
        console.error('CSR activity log write failed:', err.message);
    }
};

// ── Listing ──────────────────────────────────────────────────────────────────

const SORTABLE = {
    created_at: 'e.created_at',
    company_name: 'e.company_name',
    budget: 'e.budget',
    committed_amount: 'e.committed_amount',
    status: 'e.status',
};

/**
 * Build the shared WHERE clause for the list, the export and the metrics header, so a
 * filtered view and its summary numbers can never disagree.
 */
const buildFilters = (q = {}) => {
    const where = [];
    const params = [];

    if (q.status) {
        const list = String(q.status).split(',').map(s => s.trim()).filter(s => s in STATUS_MAP);
        if (list.length) {
            where.push(`e.status IN (${list.map(() => '?').join(',')})`);
            params.push(...list);
        }
    }
    if (q.ownerId) {
        if (q.ownerId === 'unassigned') where.push('e.owner_admin_id IS NULL');
        else { where.push('e.owner_admin_id = ?'); params.push(q.ownerId); }
    }
    if (q.projectId) { where.push('e.preferred_project_id = ?'); params.push(q.projectId); }
    if (q.area) { where.push('e.area_of_interest = ?'); params.push(q.area); }

    if (q.budgetMin) { where.push('e.budget >= ?'); params.push(Number(q.budgetMin)); }
    if (q.budgetMax) { where.push('e.budget <= ?'); params.push(Number(q.budgetMax)); }

    if (q.dateFrom) { where.push('e.created_at >= ?'); params.push(`${q.dateFrom} 00:00:00`); }
    if (q.dateTo) { where.push('e.created_at <= ?'); params.push(`${q.dateTo} 23:59:59`); }

    if (q.search) {
        const term = `%${String(q.search).trim()}%`;
        where.push(`(e.csr_id LIKE ? OR e.company_name LIKE ? OR e.contact_person LIKE ?
                     OR e.email LIKE ? OR e.phone LIKE ? OR e.location LIKE ?)`);
        params.push(term, term, term, term, term, term);
    }

    return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
};

const list = async (q = {}) => {
    const page = Math.max(1, parseInt(q.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(q.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { clause, params } = buildFilters(q);
    const sortCol = SORTABLE[q.sortBy] || SORTABLE.created_at;
    const sortDir = String(q.sortDir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const rows = await db.query(
        `SELECT e.id, e.csr_id, e.company_name, e.contact_person, e.designation, e.email,
                e.phone, e.budget, e.committed_amount, e.received_amount, e.area_of_interest,
                e.status, e.location, e.created_at,
                p.name AS project_name, p.slug AS project_slug,
                a.id AS owner_id, a.name AS owner_name, a.username AS owner_username
         FROM csr_enquiries e
         LEFT JOIN projects p ON p.id = e.preferred_project_id
         LEFT JOIN admin_users a ON a.id = e.owner_admin_id
         ${clause}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const total = await db.query(
        `SELECT COUNT(*) AS n FROM csr_enquiries e ${clause}`, params
    );

    return {
        enquiries: rows.rows.map(decorate),
        pagination: {
            page, limit,
            total: Number(total.rows[0].n),
            pages: Math.ceil(Number(total.rows[0].n) / limit) || 1,
        },
    };
};

const decorate = (row) => ({
    ...row,
    status_label: statusLabel(row.status),
    owner_name: row.owner_name || row.owner_username || null,
});

// ── Metrics header ───────────────────────────────────────────────────────────

/**
 * Summary numbers for the current filtered view: totals, per-stage counts, committed and
 * received value, and how many partnerships are live.
 */
const metrics = async (q = {}) => {
    const { clause, params } = buildFilters(q);

    const totals = await db.query(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(e.committed_amount), 0) AS committed,
                COALESCE(SUM(e.received_amount), 0)  AS received,
                COALESCE(SUM(e.budget), 0)           AS indicated
         FROM csr_enquiries e ${clause}`, params
    );

    const byStage = await db.query(
        `SELECT e.status, COUNT(*) AS n
         FROM csr_enquiries e ${clause}
         GROUP BY e.status`, params
    );

    const counts = Object.fromEntries(byStage.rows.map(r => [r.status, Number(r.n)]));

    // "Active partnerships" = committed and not yet closed.
    const activeKeys = STATUSES.filter(s => s.open).map(s => s.key)
        .filter(k => ['approved', 'mou_signed', 'funds_awaited', 'funds_received', 'implementation', 'impact_reporting'].includes(k));
    const active = activeKeys.reduce((n, k) => n + (counts[k] || 0), 0);

    return {
        total: Number(totals.rows[0].total),
        committedValue: Number(totals.rows[0].committed),
        receivedValue: Number(totals.rows[0].received),
        indicatedValue: Number(totals.rows[0].indicated),
        activePartnerships: active,
        byStage: STATUSES.map(s => ({ ...s, count: counts[s.key] || 0 })),
    };
};

// ── Detail ───────────────────────────────────────────────────────────────────

const getById = async (id) => {
    const result = await db.query(
        `SELECT e.*, p.name AS project_name, p.slug AS project_slug,
                a.name AS owner_name, a.username AS owner_username, a.email AS owner_email
         FROM csr_enquiries e
         LEFT JOIN projects p ON p.id = e.preferred_project_id
         LEFT JOIN admin_users a ON a.id = e.owner_admin_id
         WHERE e.id = ?`, [id]
    );
    const enquiry = result.rows[0];
    if (!enquiry) throw { status: 404, message: 'Enquiry not found' };

    const [notes, documents, milestones, activity] = await Promise.all([
        db.query('SELECT * FROM csr_enquiry_notes WHERE enquiry_id = ? ORDER BY created_at DESC', [id]),
        db.query('SELECT * FROM csr_enquiry_documents WHERE enquiry_id = ? ORDER BY created_at DESC', [id]),
        db.query('SELECT * FROM csr_enquiry_milestones WHERE enquiry_id = ? ORDER BY sort_order ASC, target_date ASC', [id]),
        // Ordered by seq, not created_at: several entries can share a one-second timestamp.
        db.query('SELECT * FROM csr_enquiry_activity_log WHERE enquiry_id = ? ORDER BY seq DESC', [id]),
    ]);

    return {
        ...decorate(enquiry),
        notes: notes.rows,
        documents: documents.rows,
        milestones: milestones.rows,
        activity: activity.rows.map(a => ({
            ...a,
            from_label: a.action === 'status_change' ? statusLabel(a.from_value) : a.from_value,
            to_label: a.action === 'status_change' ? statusLabel(a.to_value) : a.to_value,
        })),
    };
};

const requireEnquiry = async (id) => {
    const r = await db.query('SELECT * FROM csr_enquiries WHERE id = ?', [id]);
    if (!r.rows.length) throw { status: 404, message: 'Enquiry not found' };
    return r.rows[0];
};

/** Enquiry joined with project + owner, in the shape the email templates expect. */
const forEmail = async (id) => {
    const r = await db.query(
        `SELECT e.*, p.name AS project_name FROM csr_enquiries e
         LEFT JOIN projects p ON p.id = e.preferred_project_id WHERE e.id = ?`, [id]
    );
    return r.rows[0];
};

const ownerOf = async (adminId) => {
    if (!adminId) return null;
    const r = await db.query('SELECT id, name, username, email FROM admin_users WHERE id = ?', [adminId]);
    return r.rows[0] || null;
};

// ── Mutations ────────────────────────────────────────────────────────────────

const updateStatus = async (id, { status, reason }, admin) => {
    if (!(status in STATUS_MAP)) throw { status: 400, message: `Unknown status: ${status}` };
    const enquiry = await requireEnquiry(id);
    if (enquiry.status === status) return getById(id);

    await db.query(
        'UPDATE csr_enquiries SET status = ?, status_reason = ? WHERE id = ?',
        [status, reason ? String(reason).trim().slice(0, 500) : null, id]
    );

    await logActivity(
        id, admin, 'status_change',
        `Status changed from ${statusLabel(enquiry.status)} to ${statusLabel(status)}` +
            (reason ? ` — ${String(reason).trim()}` : ''),
        enquiry.status, status
    );

    await notifyStatusChange(id, status, admin);
    return getById(id);
};

/** Fire the status alert if this stage is configured to send one. */
const notifyStatusChange = async (id, status, admin) => {
    try {
        const cfg = await db.query('SELECT * FROM csr_status_alert_config WHERE status = ?', [status]);
        const row = cfg.rows[0];
        if (!row || (!row.notify_owner && !row.notify_team)) return;

        const enquiry = await forEmail(id);
        const owner = await ownerOf(enquiry.owner_admin_id);
        // notify_team routes to the internal inboxes; notify_owner adds the assignee.
        await emailSvc.sendStatusChange(enquiry, row.notify_owner ? owner : null, { teamCopy: !!row.notify_team });
    } catch (err) {
        console.error('CSR status alert failed:', err.message);
    }
};

const assignOwner = async (id, ownerAdminId, admin) => {
    const enquiry = await requireEnquiry(id);
    const owner = ownerAdminId ? await ownerOf(ownerAdminId) : null;
    if (ownerAdminId && !owner) throw { status: 400, message: 'Unknown admin user' };

    await db.query('UPDATE csr_enquiries SET owner_admin_id = ? WHERE id = ?', [ownerAdminId || null, id]);

    const previous = await ownerOf(enquiry.owner_admin_id);
    await logActivity(
        id, admin, 'assignment',
        owner ? `Assigned to ${actorName(owner)}` : 'Owner cleared',
        previous ? actorName(previous) : null,
        owner ? actorName(owner) : null
    );

    if (owner) {
        try {
            await emailSvc.sendAssignment(await forEmail(id), owner);
        } catch (err) {
            console.error('CSR assignment email failed:', err.message);
        }
    }
    return getById(id);
};

const updateAmounts = async (id, { committedAmount, receivedAmount }, admin) => {
    const enquiry = await requireEnquiry(id);
    const committed = committedAmount === '' || committedAmount == null ? null : Number(committedAmount);
    const received = receivedAmount == null ? Number(enquiry.received_amount) : Number(receivedAmount);

    if (committed != null && (!Number.isFinite(committed) || committed < 0)) {
        throw { status: 400, message: 'Committed amount must be a positive number.' };
    }
    if (!Number.isFinite(received) || received < 0) {
        throw { status: 400, message: 'Received amount must be a positive number.' };
    }

    await db.query(
        'UPDATE csr_enquiries SET committed_amount = ?, received_amount = ? WHERE id = ?',
        [committed, received, id]
    );
    await logActivity(
        id, admin, 'amounts',
        `Committed set to ${committed ?? '—'}, received set to ${received}`,
        `${enquiry.committed_amount ?? '—'} / ${enquiry.received_amount}`,
        `${committed ?? '—'} / ${received}`
    );
    return getById(id);
};

// ── Notes ────────────────────────────────────────────────────────────────────

const addNote = async (id, body, admin) => {
    const text = String(body || '').trim();
    if (!text) throw { status: 400, message: 'Note cannot be empty.' };
    if (text.length > 5000) throw { status: 400, message: 'Note is too long (5000 characters max).' };
    await requireEnquiry(id);

    await db.query(
        'INSERT INTO csr_enquiry_notes (enquiry_id, admin_id, author_name, body) VALUES (?, ?, ?, ?)',
        [id, admin?.id || null, actorName(admin), text]
    );
    await logActivity(id, admin, 'note', 'Added an internal note');
    return getById(id);
};

// ── Milestones ───────────────────────────────────────────────────────────────

const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed', 'missed'];

const addMilestone = async (id, data, admin) => {
    const title = String(data.title || '').trim();
    if (!title) throw { status: 400, message: 'Milestone title is required.' };
    await requireEnquiry(id);

    const order = await db.query(
        'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM csr_enquiry_milestones WHERE enquiry_id = ?', [id]
    );

    await db.query(
        `INSERT INTO csr_enquiry_milestones
            (enquiry_id, title, description, target_date, actual_date, status, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            id, title.slice(0, 200),
            data.description ? String(data.description).trim() : null,
            data.targetDate || null, data.actualDate || null,
            MILESTONE_STATUSES.includes(data.status) ? data.status : 'pending',
            Number(order.rows[0].n),
        ]
    );
    await logActivity(id, admin, 'milestone', `Added milestone "${title}"`);
    return getById(id);
};

const updateMilestone = async (id, milestoneId, data, admin) => {
    const existing = await db.query(
        'SELECT * FROM csr_enquiry_milestones WHERE id = ? AND enquiry_id = ?', [milestoneId, id]
    );
    if (!existing.rows.length) throw { status: 404, message: 'Milestone not found' };
    const m = existing.rows[0];

    const title = data.title != null ? String(data.title).trim().slice(0, 200) : m.title;
    if (!title) throw { status: 400, message: 'Milestone title is required.' };

    await db.query(
        `UPDATE csr_enquiry_milestones
         SET title = ?, description = ?, target_date = ?, actual_date = ?, status = ?
         WHERE id = ?`,
        [
            title,
            data.description !== undefined ? (String(data.description).trim() || null) : m.description,
            data.targetDate !== undefined ? (data.targetDate || null) : m.target_date,
            data.actualDate !== undefined ? (data.actualDate || null) : m.actual_date,
            MILESTONE_STATUSES.includes(data.status) ? data.status : m.status,
            milestoneId,
        ]
    );
    await logActivity(id, admin, 'milestone', `Updated milestone "${title}"`);
    return getById(id);
};

const deleteMilestone = async (id, milestoneId, admin) => {
    const existing = await db.query(
        'SELECT title FROM csr_enquiry_milestones WHERE id = ? AND enquiry_id = ?', [milestoneId, id]
    );
    if (!existing.rows.length) throw { status: 404, message: 'Milestone not found' };

    await db.query('DELETE FROM csr_enquiry_milestones WHERE id = ?', [milestoneId]);
    await logActivity(id, admin, 'milestone', `Removed milestone "${existing.rows[0].title}"`);
    return getById(id);
};

// ── Documents ────────────────────────────────────────────────────────────────

const addDocument = async (id, file, admin) => {
    if (!file) throw { status: 400, message: 'No file received.' };
    await requireEnquiry(id);

    await db.query(
        `INSERT INTO csr_enquiry_documents
            (enquiry_id, admin_id, uploader_name, original_name, stored_name, mime_type, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, admin?.id || null, actorName(admin), file.originalname, file.filename, file.mimetype, file.size]
    );
    await logActivity(id, admin, 'document', `Uploaded "${file.originalname}"`);
    return getById(id);
};

const getDocument = async (id, documentId) => {
    const r = await db.query(
        'SELECT * FROM csr_enquiry_documents WHERE id = ? AND enquiry_id = ?', [documentId, id]
    );
    if (!r.rows.length) throw { status: 404, message: 'Document not found' };
    return r.rows[0];
};

const deleteDocument = async (id, documentId, admin) => {
    const doc = await getDocument(id, documentId);
    await db.query('DELETE FROM csr_enquiry_documents WHERE id = ?', [documentId]);
    await logActivity(id, admin, 'document', `Removed "${doc.original_name}"`);
    return doc;
};

// ── Reporting ────────────────────────────────────────────────────────────────

/** Indian financial year (April–March) presets, plus calendar year and rolling windows. */
const dateRangePreset = (preset, today = new Date()) => {
    const iso = (d) => d.toISOString().slice(0, 10);
    const y = today.getFullYear();
    // Before April, the current FY started in the previous calendar year.
    const fyStartYear = today.getMonth() >= 3 ? y : y - 1;

    switch (preset) {
        case 'fy_current': return { dateFrom: `${fyStartYear}-04-01`, dateTo: `${fyStartYear + 1}-03-31` };
        case 'fy_previous': return { dateFrom: `${fyStartYear - 1}-04-01`, dateTo: `${fyStartYear}-03-31` };
        case 'fy_next': return { dateFrom: `${fyStartYear + 1}-04-01`, dateTo: `${fyStartYear + 2}-03-31` };
        case 'cy_current': return { dateFrom: `${y}-01-01`, dateTo: `${y}-12-31` };
        case 'last_30': {
            const from = new Date(today); from.setDate(from.getDate() - 30);
            return { dateFrom: iso(from), dateTo: iso(today) };
        }
        case 'last_90': {
            const from = new Date(today); from.setDate(from.getDate() - 90);
            return { dateFrom: iso(from), dateTo: iso(today) };
        }
        default: return {};
    }
};

const PRESETS = [
    { key: 'fy_current', label: 'This financial year' },
    { key: 'fy_previous', label: 'Last financial year' },
    { key: 'fy_next', label: 'Next financial year' },
    { key: 'cy_current', label: 'This calendar year' },
    { key: 'last_30', label: 'Last 30 days' },
    { key: 'last_90', label: 'Last 90 days' },
];

/** Pipeline report grouped by stage, owner or project, with committed vs received. */
const pipelineReport = async (q = {}) => {
    const groupBy = ['stage', 'owner', 'project'].includes(q.groupBy) ? q.groupBy : 'stage';
    const { clause, params } = buildFilters(q);

    const groupSql = {
        stage: { select: 'e.status AS group_key', join: '' },
        owner: { select: 'COALESCE(a.name, a.username, \'Unassigned\') AS group_key', join: 'LEFT JOIN admin_users a ON a.id = e.owner_admin_id' },
        project: { select: 'COALESCE(p.name, \'No project\') AS group_key', join: 'LEFT JOIN projects p ON p.id = e.preferred_project_id' },
    }[groupBy];

    const rows = await db.query(
        `SELECT ${groupSql.select},
                COUNT(*) AS enquiries,
                COALESCE(SUM(e.budget), 0)           AS indicated,
                COALESCE(SUM(e.committed_amount), 0) AS committed,
                COALESCE(SUM(e.received_amount), 0)  AS received
         FROM csr_enquiries e
         ${groupSql.join}
         ${clause}
         GROUP BY group_key
         ORDER BY committed DESC, enquiries DESC`,
        params
    );

    return {
        groupBy,
        rows: rows.rows.map(r => ({
            key: r.group_key,
            label: groupBy === 'stage' ? statusLabel(r.group_key) : r.group_key,
            enquiries: Number(r.enquiries),
            indicated: Number(r.indicated),
            committed: Number(r.committed),
            received: Number(r.received),
            // What has been committed but not yet banked.
            outstanding: Number(r.committed) - Number(r.received),
        })),
    };
};

/** Every row matching the current filters, flattened for Excel/CSV. */
const exportRows = async (q = {}) => {
    const { clause, params } = buildFilters(q);
    const rows = await db.query(
        `SELECT e.csr_id, e.company_name, e.contact_person, e.designation, e.email, e.phone,
                e.budget, e.committed_amount, e.received_amount, e.area_of_interest,
                e.location, e.status, e.status_reason, e.message, e.created_at,
                p.name AS project_name,
                COALESCE(a.name, a.username) AS owner_name
         FROM csr_enquiries e
         LEFT JOIN projects p ON p.id = e.preferred_project_id
         LEFT JOIN admin_users a ON a.id = e.owner_admin_id
         ${clause}
         ORDER BY e.created_at DESC`,
        params
    );

    return rows.rows.map(r => ({
        'CSR ID': r.csr_id,
        'Company': r.company_name,
        'Contact Person': r.contact_person,
        'Designation': r.designation,
        'Email': r.email,
        'Phone': r.phone,
        'Indicated Budget': Number(r.budget),
        'Committed Amount': r.committed_amount == null ? '' : Number(r.committed_amount),
        'Received Amount': Number(r.received_amount),
        'Outstanding': r.committed_amount == null ? '' : Number(r.committed_amount) - Number(r.received_amount),
        'Area of Interest': r.area_of_interest,
        'Preferred Project': r.project_name || '',
        'Location': r.location || '',
        'Status': statusLabel(r.status),
        'Status Reason': r.status_reason || '',
        'Owner': r.owner_name || 'Unassigned',
        'Message': r.message || '',
        'Submitted On': new Date(r.created_at).toLocaleString('en-IN'),
    }));
};

// ── Reference data ───────────────────────────────────────────────────────────

const admins = async () => {
    const r = await db.query(
        "SELECT id, name, username, email, role FROM admin_users WHERE is_active = true ORDER BY COALESCE(name, username)"
    );
    return r.rows;
};

/**
 * Areas actually present on enquiries, for the list filter. Read from the data rather than
 * a fixed list so the dropdown can never offer a value that matches nothing, and still
 * covers areas added to the public form later.
 */
const areas = async () => {
    const r = await db.query(
        `SELECT DISTINCT area_of_interest FROM csr_enquiries
         WHERE area_of_interest IS NOT NULL AND area_of_interest <> ''
         ORDER BY area_of_interest ASC`
    );
    return r.rows.map(x => x.area_of_interest);
};

const alertConfig = async () => {
    const r = await db.query('SELECT * FROM csr_status_alert_config');
    const byStatus = Object.fromEntries(r.rows.map(x => [x.status, x]));
    return STATUSES.map(s => ({
        ...s,
        notifyOwner: !!byStatus[s.key]?.notify_owner,
        notifyTeam: !!byStatus[s.key]?.notify_team,
    }));
};

const updateAlertConfig = async (status, { notifyOwner, notifyTeam }) => {
    if (!(status in STATUS_MAP)) throw { status: 400, message: `Unknown status: ${status}` };
    await db.query(
        `INSERT INTO csr_status_alert_config (status, notify_owner, notify_team)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE notify_owner = VALUES(notify_owner), notify_team = VALUES(notify_team)`,
        [status, !!notifyOwner, !!notifyTeam]
    );
    return alertConfig();
};

module.exports = {
    STATUSES,
    STATUS_MAP,
    statusLabel,
    PRESETS,
    dateRangePreset,
    list,
    metrics,
    getById,
    updateStatus,
    assignOwner,
    updateAmounts,
    addNote,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addDocument,
    getDocument,
    deleteDocument,
    pipelineReport,
    exportRows,
    admins,
    areas,
    alertConfig,
    updateAlertConfig,
};
