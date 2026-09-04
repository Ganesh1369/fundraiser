const db = require('../config/db');

/**
 * Editable content for the CSR and Volunteer pages.
 *
 * Three small tables sharing one shape (title, description, icon, order, active), so they
 * are handled generically rather than with three near-identical services.
 */

const TABLES = {
    csrFocusAreas: {
        table: 'csr_focus_areas',
        label: 'CSR area of contribution',
        fields: ['title', 'description', 'icon', 'accent'],
        required: ['title', 'description'],
    },
    volunteerRoles: {
        table: 'volunteer_roles',
        label: 'Volunteer role',
        fields: ['title', 'focus_area', 'location', 'commitment', 'description', 'icon', 'accent'],
        required: ['title', 'focus_area', 'location', 'commitment', 'description'],
    },
    volunteerEligibility: {
        table: 'volunteer_eligibility',
        label: 'Eligibility point',
        fields: ['title', 'description', 'icon'],
        required: ['title', 'description'],
    },
};

/**
 * Colour keys an admin may choose. Tailwind class names are resolved in the frontend —
 * storing them here would break the moment the design system changed.
 */
const ACCENTS = ['primary', 'blue', 'green', 'amber', 'purple', 'rose'];

const config = (key) => {
    const c = TABLES[key];
    if (!c) throw { status: 400, message: `Unknown content type: ${key}` };
    return c;
};

/** Active rows in display order — what the public pages render. */
const listPublic = async (key) => {
    const { table } = config(key);
    const r = await db.query(
        `SELECT * FROM \`${table}\` WHERE is_active = true ORDER BY display_order ASC, title ASC`
    );
    return r.rows;
};

/** Every row including inactive ones — what the admin screen edits. */
const listAdmin = async (key) => {
    const { table } = config(key);
    const r = await db.query(
        `SELECT * FROM \`${table}\` ORDER BY display_order ASC, title ASC`
    );
    return r.rows;
};

const clean = (key, body) => {
    const { fields, required, label } = config(key);
    const row = {};

    for (const f of fields) {
        // Accept camelCase from the client as well as the snake_case column name.
        const camel = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        const raw = body[f] !== undefined ? body[f] : body[camel];
        row[f] = typeof raw === 'string' ? raw.trim() : (raw ?? null);
    }

    for (const f of required) {
        if (!row[f]) throw { status: 400, message: `${label}: ${f.replace(/_/g, ' ')} is required.` };
    }
    if (row.accent && !ACCENTS.includes(row.accent)) {
        throw { status: 400, message: `Unknown colour: ${row.accent}` };
    }
    return row;
};

const create = async (key, body) => {
    const { table } = config(key);
    const row = clean(key, body);

    const order = await db.query(
        `SELECT COALESCE(MAX(display_order), 0) + 1 AS n FROM \`${table}\``
    );

    const cols = [...Object.keys(row), 'display_order', 'is_active'];
    const values = [...Object.values(row), Number(order.rows[0].n), body.isActive !== false];

    await db.query(
        `INSERT INTO \`${table}\` (${cols.map(c => `\`${c}\``).join(', ')})
         VALUES (${cols.map(() => '?').join(', ')})`,
        values
    );
    return listAdmin(key);
};

const update = async (key, id, body) => {
    const { table, label } = config(key);
    const existing = await db.query(`SELECT id FROM \`${table}\` WHERE id = ?`, [id]);
    if (!existing.rows.length) throw { status: 404, message: `${label} not found` };

    const row = clean(key, body);
    const sets = Object.keys(row).map(c => `\`${c}\` = ?`);
    const values = Object.values(row);

    if (typeof body.isActive === 'boolean') { sets.push('`is_active` = ?'); values.push(body.isActive); }
    if (Number.isFinite(Number(body.displayOrder))) { sets.push('`display_order` = ?'); values.push(Number(body.displayOrder)); }

    await db.query(`UPDATE \`${table}\` SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
    return listAdmin(key);
};

const remove = async (key, id) => {
    const { table, label } = config(key);
    const r = await db.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
    if (!r.rowCount) throw { status: 404, message: `${label} not found` };
    return listAdmin(key);
};

/** Persist a drag-free ordering: the client sends ids in the order it wants them. */
const reorder = async (key, ids) => {
    const { table } = config(key);
    if (!Array.isArray(ids) || !ids.length) throw { status: 400, message: 'No order supplied.' };

    const conn = await db.getClient();
    try {
        await conn.beginTransaction();
        for (let i = 0; i < ids.length; i++) {
            await conn.query(`UPDATE \`${table}\` SET display_order = ? WHERE id = ?`, [i + 1, ids[i]]);
        }
        await conn.commit();
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
    return listAdmin(key);
};

/**
 * Area-of-interest options for the volunteer registration form and admin filter, taken
 * from the live roles so the two can never drift apart.
 */
const volunteerAreas = async () => {
    const r = await db.query(
        `SELECT DISTINCT focus_area FROM volunteer_roles
         WHERE is_active = true AND focus_area <> '' ORDER BY focus_area ASC`
    );
    return r.rows.map(x => x.focus_area);
};

module.exports = {
    TABLES,
    ACCENTS,
    listPublic,
    listAdmin,
    create,
    update,
    remove,
    reorder,
    volunteerAreas,
};
