const prisma = require('../config/prisma');

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

    const rows = await prisma.orgSetting.findMany({
        orderBy: { setting_key: 'asc' }
    });
    const indexed = Object.fromEntries(rows.map(r => [r.setting_key, r]));
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

    const ops = Object.entries(updates).map(([key, value]) =>
        prisma.orgSetting.update({
            where: { setting_key: key },
            data: {
                setting_value: value == null ? null : String(value),
                updated_by: adminId || null
            }
        })
    );
    await prisma.$transaction(ops);
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
    await prisma.orgSetting.update({
        where: { setting_key: key },
        data: {
            setting_value: value == null ? null : String(value),
            updated_by: adminId || null
        }
    });
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

/**
 * Public-safe trust block — what we show anonymously on the project page
 * footer and near the Pay button. Keys map to ICE's compliance numbers.
 * Returns nulls for unset keys so the frontend can hide rows gracefully.
 */
const getPublicTrust = async () => {
    const all = await getAll();
    const val = (k) => (all[k]?.setting_value || null);
    return {
        legalName:       val('ice_legal_name'),
        registeredAddress: val('ice_registered_address'),
        pan:             val('ice_pan'),
        reg80gNumber:    val('ice_80g_reg_number'),
        reg80gValidFrom: val('ice_80g_valid_from'),
        reg80gValidTo:   val('ice_80g_valid_to'),
        regCsr1Number:   val('ice_csr1_reg_number'),
        signatoryName:   val('ice_signatory_name'),
    };
};

module.exports = {
    getAll,
    updateMany,
    setOne,
    getMissingRequired,
    assertRequired,
    bustCache,
    getPublicTrust,
};
