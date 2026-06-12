const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@icenetwork.in';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const isConfigured = () => !!(VAPID_PUBLIC && VAPID_PRIVATE);

const getPublicKey = () => VAPID_PUBLIC;

const saveSubscription = async (userId, subscription) => {
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        throw { status: 400, message: 'Invalid subscription payload' };
    }
    // Upsert by user_id (current schema has user_id UNIQUE).
    const id = uuidv4();
    await db.query(
        `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            endpoint = VALUES(endpoint),
            p256dh   = VALUES(p256dh),
            auth     = VALUES(auth)`,
        [id, userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
    return { ok: true };
};

const removeSubscription = async (userId) => {
    await db.query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
    return { ok: true };
};

/**
 * Send a push notification to one user (no-op if not subscribed).
 * Returns { sent: true } / { sent: false, reason }.
 */
const sendToUser = async (userId, payload) => {
    if (!isConfigured()) return { sent: false, reason: 'vapid_not_configured' };
    const r = await db.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ? LIMIT 1',
        [userId]
    );
    if (r.rows.length === 0) return { sent: false, reason: 'no_subscription' };
    const sub = {
        endpoint: r.rows[0].endpoint,
        keys: { p256dh: r.rows[0].p256dh, auth: r.rows[0].auth }
    };
    try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
        return { sent: true };
    } catch (err) {
        // 404/410 — subscription gone (uninstalled, denied). Reap silently.
        if (err.statusCode === 404 || err.statusCode === 410) {
            await db.query('DELETE FROM push_subscriptions WHERE user_id = ?', [userId]);
        }
        return { sent: false, reason: err.statusCode ? `gateway_${err.statusCode}` : 'send_failed' };
    }
};

/**
 * Bulk dispatch — caller provides the audience userIds, we fan out.
 * Returns counts. Failures don't throw (this is best-effort).
 */
const sendToUsers = async (userIds, payload) => {
    if (!isConfigured() || !userIds?.length) {
        return { configured: isConfigured(), attempted: 0, sent: 0 };
    }
    let sent = 0;
    for (const uid of userIds) {
        const res = await sendToUser(uid, payload);
        if (res.sent) sent++;
    }
    return { configured: true, attempted: userIds.length, sent };
};

module.exports = {
    isConfigured,
    getPublicKey,
    saveSubscription,
    removeSubscription,
    sendToUser,
    sendToUsers
};
