const { v4: uuidv4 } = require('uuid');
const xlsx = require('xlsx');
const db = require('../config/db');

const projectSlugToId = async (slug) => {
    if (!slug) return null;
    const r = await db.query('SELECT id FROM projects WHERE slug = ? LIMIT 1', [slug]);
    return r.rows[0]?.id || null;
};

const eventIdFromSlugOrId = async (idOrSlug) => {
    if (!idOrSlug) return null;
    // Events don't have slugs in current schema — caller passes UUID. Validate it exists.
    const r = await db.query('SELECT id FROM events WHERE id = ? LIMIT 1', [idOrSlug]);
    return r.rows[0]?.id || null;
};

const trim = (v, max = 255) => (typeof v === 'string' ? v.trim().slice(0, max) : null);

const createLead = async (body) => {
    const email = trim(body.email)?.toLowerCase() || null;
    const phone = trim(body.phone, 20) || null;
    if (!email && !phone) throw { status: 400, message: 'Email or phone is required' };

    const projectId = await projectSlugToId(body.projectSlug);
    const eventId = await eventIdFromSlugOrId(body.eventId);

    const id = uuidv4();
    await db.query(
        `INSERT INTO share_leads (
            id, email, phone, name, project_id, event_id,
            utm_source, utm_medium, utm_campaign, utm_content,
            referrer_url, landing_path, opted_in_push
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            id, email, phone, trim(body.name, 150), projectId, eventId,
            trim(body.utmSource, 100), trim(body.utmMedium, 100),
            trim(body.utmCampaign, 150), trim(body.utmContent, 150),
            trim(body.referrerUrl, 500), trim(body.landingPath, 300),
            body.optedInPush ? 1 : 0
        ]
    );

    return { id };
};

const buildWhere = ({ projectId, eventId, utmSource, optedInPush, search }) => {
    const conditions = [];
    const params = [];
    if (projectId) { conditions.push('sl.project_id = ?'); params.push(projectId); }
    if (eventId) { conditions.push('sl.event_id = ?'); params.push(eventId); }
    if (utmSource) { conditions.push('sl.utm_source = ?'); params.push(utmSource); }
    if (optedInPush === 'true' || optedInPush === true) { conditions.push('sl.opted_in_push = 1'); }
    if (search) {
        conditions.push('(sl.email LIKE ? OR sl.phone LIKE ? OR sl.name LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like, like);
    }
    return { whereClause: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '', params };
};

const adminList = async (query = {}) => {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const offset = (page - 1) * limit;
    const { whereClause, params } = buildWhere(query);

    const countResult = await db.query(
        `SELECT COUNT(*) AS count FROM share_leads sl ${whereClause}`,
        params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
        `SELECT sl.id, sl.email, sl.phone, sl.name,
                sl.project_id, p.name AS project_name,
                sl.event_id, e.event_name,
                sl.utm_source, sl.utm_medium, sl.utm_campaign, sl.utm_content,
                sl.referrer_url, sl.landing_path, sl.opted_in_push,
                sl.converted_user_id, sl.created_at
         FROM share_leads sl
         LEFT JOIN projects p ON p.id = sl.project_id
         LEFT JOIN events e ON e.id = sl.event_id
         ${whereClause}
         ORDER BY sl.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return {
        leads: result.rows,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
    };
};

const adminExport = async (query = {}) => {
    const { whereClause, params } = buildWhere(query);
    const result = await db.query(
        `SELECT sl.email AS "Email", sl.phone AS "Phone", sl.name AS "Name",
                p.name AS "Project", e.event_name AS "Event",
                sl.utm_source AS "UTM Source", sl.utm_medium AS "UTM Medium",
                sl.utm_campaign AS "UTM Campaign", sl.utm_content AS "UTM Content",
                sl.referrer_url AS "Referrer URL", sl.landing_path AS "Landing Path",
                IF(sl.opted_in_push = 1, 'yes', 'no') AS "Push Opt-in",
                IF(sl.converted_user_id IS NOT NULL, 'yes', 'no') AS "Converted to User",
                sl.created_at AS "Captured At"
         FROM share_leads sl
         LEFT JOIN projects p ON p.id = sl.project_id
         LEFT JOIN events e ON e.id = sl.event_id
         ${whereClause}
         ORDER BY sl.created_at DESC`,
        params
    );

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(result.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Share Leads');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = { createLead, adminList, adminExport };
