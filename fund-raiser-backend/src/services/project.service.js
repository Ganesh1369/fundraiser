const db = require('../config/db');

const emptyStats = () => ({ totalRaised: 0, donationCount: 0, donorCount: 0, eventCount: 0 });

// mysql2 stores JSON columns as either a JS value (when the driver auto-parses)
// or a JSON-encoded string. Normalise to a JS value on the way out.
const parseJsonField = (val) => {
    if (val == null) return null;
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
    }
    return val;
};

const hydrateProject = (row) => {
    if (!row) return row;
    return { ...row, banner_urls: parseJsonField(row.banner_urls) };
};

const buildPlaceholders = (count) => Array(count).fill('?').join(',');

const computeStatsForProjects = async (projectIds) => {
    const stats = {};
    for (const id of projectIds) stats[id] = emptyStats();
    if (projectIds.length === 0) return stats;

    const placeholders = buildPlaceholders(projectIds.length);

    const [donationAgg, donorAgg, eventAgg] = await Promise.all([
        db.query(
            `SELECT project_id, SUM(amount) AS sum_amount, COUNT(*) AS count_all
             FROM donations
             WHERE project_id IN (${placeholders}) AND status = 'completed'
             GROUP BY project_id`,
            projectIds
        ),
        db.query(
            `SELECT project_id, COUNT(DISTINCT user_id) AS donor_count
             FROM donations
             WHERE project_id IN (${placeholders}) AND status = 'completed'
             GROUP BY project_id`,
            projectIds
        ),
        db.query(
            `SELECT project_id, COUNT(*) AS count_all
             FROM events
             WHERE project_id IN (${placeholders}) AND is_active = true
             GROUP BY project_id`,
            projectIds
        )
    ]);

    for (const row of donationAgg.rows) {
        if (!row.project_id || !stats[row.project_id]) continue;
        stats[row.project_id].totalRaised = row.sum_amount ? Number(row.sum_amount) : 0;
        stats[row.project_id].donationCount = Number(row.count_all) || 0;
    }
    for (const row of donorAgg.rows) {
        if (!row.project_id || !stats[row.project_id]) continue;
        stats[row.project_id].donorCount = Number(row.donor_count) || 0;
    }
    for (const row of eventAgg.rows) {
        if (!row.project_id || !stats[row.project_id]) continue;
        stats[row.project_id].eventCount = Number(row.count_all) || 0;
    }
    return stats;
};

const fetchAccomplishmentsFor = async (projectId) => {
    const result = await db.query(
        `SELECT id, project_id, title, description, metric_value, metric_unit, icon, display_order, created_at, updated_at
         FROM accomplishments
         WHERE project_id = ?
         ORDER BY display_order ASC, created_at ASC`,
        [projectId]
    );
    return result.rows;
};

const listActive = async () => {
    const result = await db.query(
        `SELECT * FROM projects
         WHERE is_active = true
         ORDER BY display_order ASC, name ASC`
    );
    const projects = result.rows.map(hydrateProject);
    const stats = await computeStatsForProjects(projects.map(p => p.id));
    return projects.map(p => ({ ...p, stats: stats[p.id] || emptyStats() }));
};

const getBySlug = async (slug) => {
    const result = await db.query('SELECT * FROM projects WHERE slug = ?', [slug]);
    const project = hydrateProject(result.rows[0]);
    if (!project || !project.is_active) {
        throw { status: 404, message: 'Project not found' };
    }
    const [accomplishments, stats] = await Promise.all([
        fetchAccomplishmentsFor(project.id),
        computeStatsForProjects([project.id])
    ]);
    return { ...project, accomplishments, stats: stats[project.id] || emptyStats() };
};

const listAllForAdmin = async () => {
    const result = await db.query(
        `SELECT p.*,
                (SELECT COUNT(*) FROM accomplishments WHERE project_id = p.id) AS accomplishments_count
         FROM projects p
         ORDER BY p.display_order ASC, p.name ASC`
    );
    return result.rows.map(row => {
        const { accomplishments_count, ...rest } = row;
        return { ...hydrateProject(rest), _count: { accomplishments: Number(accomplishments_count) || 0 } };
    });
};

const getByIdForAdmin = async (id) => {
    const result = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    const project = hydrateProject(result.rows[0]);
    if (!project) throw { status: 404, message: 'Project not found' };
    const accomplishments = await fetchAccomplishmentsFor(project.id);
    return { ...project, accomplishments };
};

const PROJECT_FIELDS = [
    'slug', 'name', 'tagline', 'logo_url', 'description',
    'vision', 'mission', 'banner_urls', 'display_order', 'is_active'
];

const pickProjectFields = (input) => {
    const data = {};
    for (const k of PROJECT_FIELDS) {
        if (input[k] !== undefined) data[k] = input[k];
    }
    return data;
};

// mysql2 needs JSON columns serialised explicitly to a string.
const serialiseValue = (col, val) => {
    if (col === 'banner_urls' && val != null && typeof val !== 'string') {
        return JSON.stringify(val);
    }
    return val;
};

const isDuplicateKeyError = (err) =>
    err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062);

const create = async (input) => {
    const data = pickProjectFields(input);
    if (!data.slug || !data.name) {
        throw { status: 400, message: 'slug and name are required' };
    }

    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(c => serialiseValue(c, data[c]));

    try {
        const insertResult = await db.query(
            `INSERT INTO projects (${cols.map(c => `\`${c}\``).join(', ')})
             VALUES (${placeholders})`,
            values
        );
        const insertedId = insertResult.rows.insertId;
        // INSERT returned mysql2's OkPacket; re-fetch by slug since id is DB-generated UUID, not auto-inc.
        const fetched = await db.query('SELECT * FROM projects WHERE slug = ?', [data.slug]);
        return hydrateProject(fetched.rows[0]);
    } catch (err) {
        if (isDuplicateKeyError(err)) {
            throw { status: 409, message: `A project with slug "${data.slug}" already exists` };
        }
        throw err;
    }
};

const update = async (id, input) => {
    const data = pickProjectFields(input);
    const cols = Object.keys(data);
    if (cols.length === 0) {
        return getByIdForAdmin(id);
    }

    const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
    const values = cols.map(c => serialiseValue(c, data[c]));

    try {
        const result = await db.query(
            `UPDATE projects SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
        if (!result.rows || result.rows.affectedRows === 0) {
            throw { status: 404, message: 'Project not found' };
        }
        const fetched = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
        return hydrateProject(fetched.rows[0]);
    } catch (err) {
        if (err.status) throw err;
        if (isDuplicateKeyError(err)) {
            throw { status: 409, message: 'Slug already in use' };
        }
        throw err;
    }
};

const toggleActive = async (id) => {
    const existing = await db.query('SELECT is_active FROM projects WHERE id = ?', [id]);
    if (existing.rows.length === 0) {
        throw { status: 404, message: 'Project not found' };
    }
    const current = !!existing.rows[0].is_active;
    await db.query('UPDATE projects SET is_active = ? WHERE id = ?', [!current, id]);
    const fetched = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    return hydrateProject(fetched.rows[0]);
};

const remove = async (id) => {
    const result = await db.query('DELETE FROM projects WHERE id = ?', [id]);
    if (!result.rows || result.rows.affectedRows === 0) {
        throw { status: 404, message: 'Project not found' };
    }
};

// ----- Accomplishments -----

const ACCOMPLISHMENT_FIELDS = [
    'title', 'description', 'metric_value', 'metric_unit', 'icon', 'display_order'
];

const pickAccomplishmentFields = (input) => {
    const data = {};
    for (const k of ACCOMPLISHMENT_FIELDS) {
        if (input[k] !== undefined) data[k] = input[k];
    }
    return data;
};

const createAccomplishment = async (projectId, input) => {
    const existsResult = await db.query('SELECT id FROM projects WHERE id = ?', [projectId]);
    if (existsResult.rows.length === 0) {
        throw { status: 404, message: 'Project not found' };
    }

    const data = pickAccomplishmentFields(input);
    if (!data.title) throw { status: 400, message: 'title is required' };

    const cols = ['project_id', ...Object.keys(data)];
    const placeholders = cols.map(() => '?').join(', ');
    const values = [projectId, ...Object.values(data)];

    await db.query(
        `INSERT INTO accomplishments (${cols.map(c => `\`${c}\``).join(', ')})
         VALUES (${placeholders})`,
        values
    );

    // UUID is generated by DB default; fetch the newest row for this project.
    const fetched = await db.query(
        `SELECT * FROM accomplishments
         WHERE project_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [projectId]
    );
    return fetched.rows[0];
};

const updateAccomplishment = async (id, input) => {
    const data = pickAccomplishmentFields(input);
    const cols = Object.keys(data);
    if (cols.length === 0) {
        const fetched = await db.query('SELECT * FROM accomplishments WHERE id = ?', [id]);
        if (fetched.rows.length === 0) throw { status: 404, message: 'Accomplishment not found' };
        return fetched.rows[0];
    }

    const setClause = cols.map(c => `\`${c}\` = ?`).join(', ');
    const values = cols.map(c => data[c]);

    const result = await db.query(
        `UPDATE accomplishments SET ${setClause} WHERE id = ?`,
        [...values, id]
    );
    if (!result.rows || result.rows.affectedRows === 0) {
        throw { status: 404, message: 'Accomplishment not found' };
    }
    const fetched = await db.query('SELECT * FROM accomplishments WHERE id = ?', [id]);
    return fetched.rows[0];
};

const deleteAccomplishment = async (id) => {
    const result = await db.query('DELETE FROM accomplishments WHERE id = ?', [id]);
    if (!result.rows || result.rows.affectedRows === 0) {
        throw { status: 404, message: 'Accomplishment not found' };
    }
};

module.exports = {
    listActive,
    getBySlug,
    listAllForAdmin,
    getByIdForAdmin,
    create,
    update,
    toggleActive,
    remove,
    createAccomplishment,
    updateAccomplishment,
    deleteAccomplishment
};
