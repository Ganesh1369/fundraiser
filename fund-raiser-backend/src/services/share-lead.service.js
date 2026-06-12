const { v4: uuidv4 } = require('uuid');
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

module.exports = { createLead };
