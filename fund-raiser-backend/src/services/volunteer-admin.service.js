const db = require('../config/db');

/**
 * Admin-side Volunteer Master: list, filters, detail, active toggle, summary and export.
 *
 * Deliberately read-only apart from the active flag — the scope calls for a register of
 * who signed up, not a workflow.
 */

const SORTABLE = {
    created_at: 'v.created_at',
    full_name: 'v.full_name',
    city: 'v.city',
    volunteer_id: 'v.volunteer_id',
    hours_per_week: 'v.hours_per_week',
};

const OCCUPATION_LABELS = {
    student: 'Student',
    working: 'Working professional',
    other: 'Other',
};

/** "Weekdays & weekends", "Weekends", etc. — how availability reads in a list. */
const availabilityLabel = (row) => {
    const parts = [];
    if (row.available_weekday) parts.push('Weekdays');
    if (row.available_weekend) parts.push('Weekends');
    const days = parts.length === 2 ? 'Weekdays & weekends' : (parts[0] || 'Not specified');
    return `${days} · ${row.hours_per_week} hrs/week`;
};

const decorate = (row) => ({
    ...row,
    occupation_label: OCCUPATION_LABELS[row.occupation_type] || row.occupation_type,
    availability_label: availabilityLabel(row),
});

/**
 * Shared WHERE clause for the list, the summary and the export, so a filtered view and
 * its counts can never disagree.
 */
const buildFilters = (q = {}) => {
    const where = [];
    const params = [];

    // Inactive records are hidden by default — that is the point of the flag. `status=all`
    // or `status=inactive` opts back in.
    if (q.status === 'inactive') where.push('v.is_active = false');
    else if (q.status !== 'all') where.push('v.is_active = true');

    // Area, institution and city match on a partial string rather than an exact one.
    // Volunteers type these freely, so "Christ University" must still be found by typing
    // "christ", and a city picked from a fixed list must still match "Chennai, TN" or a
    // stray trailing space in the stored value.
    if (q.area) { where.push('v.area_of_interest LIKE ?'); params.push(`%${String(q.area).trim()}%`); }
    if (q.occupationType) { where.push('v.occupation_type = ?'); params.push(q.occupationType); }
    if (q.institution) { where.push('v.institution LIKE ?'); params.push(`%${String(q.institution).trim()}%`); }
    if (q.city) { where.push('v.city LIKE ?'); params.push(`%${String(q.city).trim()}%`); }
    if (q.pincode) { where.push('v.pincode = ?'); params.push(q.pincode); }

    // Availability filters on day type; "any" leaves it alone.
    if (q.availability === 'weekday') where.push('v.available_weekday = true');
    else if (q.availability === 'weekend') where.push('v.available_weekend = true');
    else if (q.availability === 'both') where.push('v.available_weekday = true AND v.available_weekend = true');

    if (q.dateFrom) { where.push('v.created_at >= ?'); params.push(`${q.dateFrom} 00:00:00`); }
    if (q.dateTo) { where.push('v.created_at <= ?'); params.push(`${q.dateTo} 23:59:59`); }

    if (q.search) {
        const term = `%${String(q.search).trim()}%`;
        where.push(`(v.volunteer_id LIKE ? OR v.full_name LIKE ? OR v.email LIKE ? OR v.phone LIKE ?)`);
        params.push(term, term, term, term);
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
        `SELECT v.id, v.volunteer_id, v.full_name, v.email, v.phone, v.city, v.pincode,
                v.occupation_type, v.institution, v.area_of_interest, v.role_of_interest,
                v.available_weekday, v.available_weekend, v.hours_per_week,
                v.is_active, v.created_at
         FROM volunteers v
         ${clause}
         ORDER BY ${sortCol} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );

    const total = await db.query(`SELECT COUNT(*) AS n FROM volunteers v ${clause}`, params);

    return {
        volunteers: rows.rows.map(decorate),
        pagination: {
            page, limit,
            total: Number(total.rows[0].n),
            pages: Math.ceil(Number(total.rows[0].n) / limit) || 1,
        },
    };
};

// ── Summary ──────────────────────────────────────────────────────────────────

/**
 * Counts for the header. Breakdowns are capped and ordered by size — a full list of every
 * pincode would be unreadable once there are a few hundred volunteers.
 */
const summary = async (q = {}) => {
    const { clause, params } = buildFilters(q);

    const groupBy = async (column, limit = 8) => {
        const r = await db.query(
            `SELECT ${column} AS label, COUNT(*) AS n
             FROM volunteers v ${clause}
             GROUP BY ${column}
             ORDER BY n DESC, label ASC
             LIMIT ${limit}`,
            params
        );
        return r.rows.map(x => ({ label: x.label, count: Number(x.n) }));
    };

    const totals = await db.query(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(v.is_active = true), 0)  AS active,
                COALESCE(SUM(v.is_active = false), 0) AS inactive,
                COALESCE(SUM(v.hours_per_week), 0)    AS hours
         FROM volunteers v ${clause}`, params
    );

    const [byPincode, byCity, byOccupation, byArea] = await Promise.all([
        groupBy('v.pincode'),
        groupBy('v.city'),
        groupBy('v.occupation_type'),
        groupBy('v.area_of_interest'),
    ]);

    return {
        total: Number(totals.rows[0].total),
        active: Number(totals.rows[0].active),
        inactive: Number(totals.rows[0].inactive),
        totalHoursPerWeek: Number(totals.rows[0].hours),
        byPincode,
        byCity,
        byOccupation: byOccupation.map(o => ({ ...o, label: OCCUPATION_LABELS[o.label] || o.label })),
        byArea,
    };
};

// ── Detail ───────────────────────────────────────────────────────────────────

const getById = async (id) => {
    const r = await db.query('SELECT * FROM volunteers WHERE id = ?', [id]);
    if (!r.rows.length) throw { status: 404, message: 'Volunteer not found' };

    const v = decorate(r.rows[0]);
    // Present the two uploads uniformly so the detail view can loop rather than branch.
    v.documents = [
        v.photo_stored_name && {
            kind: 'photo', label: 'Photo',
            originalName: v.photo_original_name, mimeType: v.photo_mime_type, sizeBytes: v.photo_size_bytes,
        },
        v.id_proof_stored_name && {
            kind: 'idProof', label: 'ID proof',
            originalName: v.id_proof_original_name, mimeType: v.id_proof_mime_type, sizeBytes: v.id_proof_size_bytes,
        },
    ].filter(Boolean);

    return v;
};

/** The stored filename for one of a volunteer's two uploads. */
const getDocument = async (id, kind) => {
    if (!['photo', 'idProof'].includes(kind)) throw { status: 400, message: 'Unknown document type' };

    const r = await db.query('SELECT * FROM volunteers WHERE id = ?', [id]);
    if (!r.rows.length) throw { status: 404, message: 'Volunteer not found' };
    const v = r.rows[0];

    const stored = kind === 'photo' ? v.photo_stored_name : v.id_proof_stored_name;
    const original = kind === 'photo' ? v.photo_original_name : v.id_proof_original_name;
    if (!stored) throw { status: 404, message: 'No such document for this volunteer' };

    return { storedName: stored, originalName: original };
};

// ── Active toggle ────────────────────────────────────────────────────────────

/** Flip the visibility flag. Not a workflow — just hides old records from the default list. */
const setActive = async (id, isActive) => {
    const r = await db.query('SELECT id FROM volunteers WHERE id = ?', [id]);
    if (!r.rows.length) throw { status: 404, message: 'Volunteer not found' };

    await db.query('UPDATE volunteers SET is_active = ? WHERE id = ?', [!!isActive, id]);
    return getById(id);
};

// ── Reference data ───────────────────────────────────────────────────────────

/**
 * Filter options, read from the data rather than a fixed list — a dropdown can then never
 * offer a value that matches nothing.
 */
const meta = async () => {
    const distinct = async (column) => {
        const r = await db.query(
            `SELECT DISTINCT ${column} AS v FROM volunteers
             WHERE ${column} IS NOT NULL AND ${column} <> '' ORDER BY ${column} ASC`
        );
        return r.rows.map(x => x.v);
    };

    const [areas, cities, institutions] = await Promise.all([
        distinct('area_of_interest'),
        distinct('city'),
        distinct('institution'),
    ]);

    return {
        areas,
        cities,
        institutions,
        occupations: Object.entries(OCCUPATION_LABELS).map(([key, label]) => ({ key, label })),
        availabilityOptions: [
            { key: 'weekday', label: 'Available weekdays' },
            { key: 'weekend', label: 'Available weekends' },
            { key: 'both', label: 'Available both' },
        ],
    };
};

// ── Export ───────────────────────────────────────────────────────────────────

/** Every row matching the current filters, flattened for Excel/CSV. */
const exportRows = async (q = {}) => {
    const { clause, params } = buildFilters(q);
    const r = await db.query(
        `SELECT * FROM volunteers v ${clause} ORDER BY v.created_at DESC`, params
    );

    return r.rows.map(v => ({
        'Volunteer ID': v.volunteer_id,
        'Name': v.full_name,
        'Date of Birth': v.date_of_birth ? new Date(v.date_of_birth).toLocaleDateString('en-IN') : '',
        'Email': v.email,
        'Phone': v.phone,
        'City': v.city,
        'Pincode': v.pincode,
        'Occupation Type': OCCUPATION_LABELS[v.occupation_type] || v.occupation_type,
        'Institution / Employer': v.institution,
        'College': v.college_name || '',
        'Course': v.course || '',
        'Area of Interest': v.area_of_interest,
        'Role of Interest': v.role_of_interest || '',
        'Availability': availabilityLabel(v),
        'Hours per Week': v.hours_per_week,
        'Languages': v.languages || '',
        'Emergency Contact': v.emergency_name,
        'Emergency Relationship': v.emergency_relationship,
        'Emergency Phone': v.emergency_phone,
        'Consent — Data Use': v.consent_data_use ? 'Yes' : 'No',
        'Consent — Photo/Media': v.consent_photo_media ? 'Yes' : 'No',
        'Photo Uploaded': v.photo_stored_name ? 'Yes' : 'No',
        'ID Proof Uploaded': v.id_proof_stored_name ? 'Yes' : 'No',
        'Status': v.is_active ? 'Active' : 'Inactive',
        'Message': v.message || '',
        'Registered On': new Date(v.created_at).toLocaleString('en-IN'),
    }));
};

module.exports = {
    list,
    summary,
    getById,
    getDocument,
    setActive,
    meta,
    exportRows,
    availabilityLabel,
    OCCUPATION_LABELS,
};
