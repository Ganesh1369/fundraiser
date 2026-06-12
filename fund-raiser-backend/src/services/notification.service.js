const db = require('../config/db');
const pushService = require('./push.service');
const emailService = require('./email.service');

/**
 * Resolve audience filters to a list of `{id, email, name}` users.
 * Filters:
 *   - eventId      → enrolled via this event OR donated to it
 *   - projectId    → donated to project OR enrolled via an event under this project
 *   - userType     → 'individual' | 'student' | 'organization'
 *   - donorsOnly   → at least one completed donation
 *   - pushOptedIn  → has an active push_subscriptions row
 */
const resolveAudience = async (filters = {}) => {
    const { eventId, projectId, userType, donorsOnly, pushOptedIn } = filters;
    const params = [];
    const where = ['u.is_active = true'];

    if (userType) { where.push('u.user_type = ?'); params.push(userType); }

    if (eventId) {
        where.push(`(u.enrolled_via_event_id = ?
                     OR EXISTS (SELECT 1 FROM donations d WHERE d.user_id = u.id AND d.event_id = ? AND d.status = 'completed'))`);
        params.push(eventId, eventId);
    }

    if (projectId) {
        where.push(`(EXISTS (SELECT 1 FROM donations d WHERE d.user_id = u.id AND d.project_id = ? AND d.status = 'completed')
                     OR EXISTS (SELECT 1 FROM events e WHERE e.id = u.enrolled_via_event_id AND e.project_id = ?))`);
        params.push(projectId, projectId);
    }

    if (donorsOnly) {
        where.push(`EXISTS (SELECT 1 FROM donations d WHERE d.user_id = u.id AND d.status = 'completed' AND d.purpose = 'donation')`);
    }

    if (pushOptedIn) {
        where.push(`EXISTS (SELECT 1 FROM push_subscriptions ps WHERE ps.user_id = u.id)`);
    }

    const sql = `SELECT u.id, u.email, u.name
                 FROM users u
                 WHERE ${where.join(' AND ')}
                 LIMIT 5000`;
    const r = await db.query(sql, params);
    return r.rows;
};

const previewAudience = async (filters = {}) => {
    const users = await resolveAudience(filters);
    let pushReachable = 0;
    if (users.length) {
        const placeholders = users.map(() => '?').join(',');
        const r = await db.query(
            `SELECT COUNT(*) AS c FROM push_subscriptions ps WHERE ps.user_id IN (${placeholders})`,
            users.map(u => u.id)
        );
        pushReachable = parseInt(r.rows[0]?.c || 0);
    }
    return {
        totalUsers: users.length,
        pushReachable,
        emailReachable: users.filter(u => !!u.email).length
    };
};

/**
 * Dispatch a notification. channels: { push: bool, email: bool }.
 * Returns counts per channel.
 */
const dispatch = async ({ filters, channels, payload }) => {
    const users = await resolveAudience(filters);
    const result = { audience: users.length, push: { attempted: 0, sent: 0 }, email: { attempted: 0, sent: 0, failed: 0 } };

    if (!users.length) return result;

    if (channels?.push) {
        const r = await pushService.sendToUsers(users.map(u => u.id), {
            title: payload.title,
            body: payload.body,
            url: payload.url || '/',
            tag: payload.tag || null
        });
        result.push = { attempted: r.attempted, sent: r.sent };
    }

    if (channels?.email) {
        const recipients = users.filter(u => !!u.email);
        result.email.attempted = recipients.length;
        for (const u of recipients) {
            try {
                await emailService.sendBroadcastEmail(u.email, payload.title, {
                    body: payload.body,
                    ctaLabel: payload.ctaLabel || null,
                    ctaUrl: payload.url || null
                });
                result.email.sent++;
            } catch {
                result.email.failed++;
            }
        }
    }

    return result;
};

module.exports = { resolveAudience, previewAudience, dispatch };
