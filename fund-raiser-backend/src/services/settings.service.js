const db = require('../config/db');

// In-process cache (60s TTL). Bust on any write.
// Acceptable because values change rarely and historical PDFs are immutable on disk.
const CACHE_TTL_MS = 60 * 1000;
let cache = { data: null, ts: 0 };

const bustCache = () => {
    cache = { data: null, ts: 0 };
};

/**
 * All org settings as a key-indexed object.
 * Returns: { [setting_key]: { setting_key, setting_value, setting_type, label, is_required, updated_at } }
 */
const getAll = async () => {
    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL_MS) return cache.data;

    const result = await db.query(
        'SELECT setting_key, setting_value, setting_type, label, is_required, updated_at, updated_by FROM org_settings ORDER BY setting_key ASC'
    );
    const indexed = Object.fromEntries(result.rows.map(r => [r.setting_key, r]));
    cache = { data: indexed, ts: now };
    return indexed;
};

/**
 * Bulk-update settings. Only allows keys that exist in the seeded set.
 * `updates` shape: { ice_legal_name: 'ICE …', ice_pan: 'AAAAA1234A', ... }
 */
const updateMany = async (updates, adminId) => {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        throw { status: 400, message: 'Invalid updates payload' };
    }
    const all = await getAll();
    const unknownKeys = Object.keys(updates).filter(k => !(k in all));
    if (unknownKeys.length > 0) {
        throw { status: 400, message: `Unknown setting keys: ${unknownKeys.join(', ')}` };
    }

    const entries = Object.entries(updates);
    if (entries.length === 0) {
        bustCache();
        return getAll();
    }

    const conn = await db.getClient();
    try {
        await conn.beginTransaction();
        for (const [key, value] of entries) {
            await conn.query(
                'UPDATE org_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
                [value == null ? null : String(value), adminId || null, key]
            );
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }

    bustCache();
    return getAll();
};

/**
 * Set a single setting (used by image upload handlers).
 */
const setOne = async (key, value, adminId) => {
    const all = await getAll();
    if (!(key in all)) {
        throw { status: 400, message: `Unknown setting key: ${key}` };
    }
    await db.query(
        'UPDATE org_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?',
        [value == null ? null : String(value), adminId || null, key]
    );
    bustCache();
};

/**
 * List of required keys whose value is empty. Used by the cert subsystem
 * to gate PDF generation and by the admin dashboard to show a setup banner.
 */
const getMissingRequired = async () => {
    const all = await getAll();
    return Object.values(all)
        .filter(s => s.is_required && (s.setting_value == null || s.setting_value === ''))
        .map(s => s.setting_key);
};

/**
 * Throws if any required setting is empty. Cert generator calls this
 * before rendering a PDF; failure is surfaced as `last_generation_error`.
 */
const assertRequired = async () => {
    const missing = await getMissingRequired();
    if (missing.length > 0) {
        throw { status: 412, message: `Org settings incomplete: ${missing.join(', ')}` };
    }
};

module.exports = {
    getAll,
    updateMany,
    setOne,
    getMissingRequired,
    assertRequired,
    bustCache
};
