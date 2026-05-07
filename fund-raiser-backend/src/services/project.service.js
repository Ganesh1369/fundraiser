const prisma = require('../config/prisma');

const projectInclude = {
    accomplishments: {
        orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }]
    }
};

const emptyStats = () => ({ totalRaised: 0, donationCount: 0, donorCount: 0, eventCount: 0 });

const computeStatsForProjects = async (projectIds) => {
    const stats = {};
    for (const id of projectIds) stats[id] = emptyStats();
    if (projectIds.length === 0) return stats;

    const [donationAgg, donorRows, eventAgg] = await Promise.all([
        prisma.donation.groupBy({
            by: ['project_id'],
            where: { project_id: { in: projectIds }, status: 'completed' },
            _sum: { amount: true },
            _count: { _all: true }
        }),
        prisma.donation.findMany({
            where: { project_id: { in: projectIds }, status: 'completed' },
            select: { project_id: true, user_id: true },
            distinct: ['project_id', 'user_id']
        }),
        prisma.event.groupBy({
            by: ['project_id'],
            where: { project_id: { in: projectIds }, is_active: true },
            _count: { _all: true }
        })
    ]);

    for (const row of donationAgg) {
        if (!row.project_id || !stats[row.project_id]) continue;
        stats[row.project_id].totalRaised = row._sum.amount ? Number(row._sum.amount) : 0;
        stats[row.project_id].donationCount = row._count._all;
    }
    for (const row of donorRows) {
        if (row.project_id && stats[row.project_id]) stats[row.project_id].donorCount += 1;
    }
    for (const row of eventAgg) {
        if (row.project_id && stats[row.project_id]) stats[row.project_id].eventCount = row._count._all;
    }
    return stats;
};

const listActive = async () => {
    const projects = await prisma.project.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }]
    });
    const stats = await computeStatsForProjects(projects.map(p => p.id));
    return projects.map(p => ({ ...p, stats: stats[p.id] || emptyStats() }));
};

const getBySlug = async (slug) => {
    const project = await prisma.project.findUnique({
        where: { slug },
        include: projectInclude
    });
    if (!project || !project.is_active) {
        throw { status: 404, message: 'Project not found' };
    }
    const stats = await computeStatsForProjects([project.id]);
    return { ...project, stats: stats[project.id] || emptyStats() };
};

const listAllForAdmin = async () => {
    return prisma.project.findMany({
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { accomplishments: true } } }
    });
};

const getByIdForAdmin = async (id) => {
    const project = await prisma.project.findUnique({
        where: { id },
        include: projectInclude
    });
    if (!project) throw { status: 404, message: 'Project not found' };
    return project;
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

const create = async (input) => {
    const data = pickProjectFields(input);
    if (!data.slug || !data.name) {
        throw { status: 400, message: 'slug and name are required' };
    }
    try {
        return await prisma.project.create({ data });
    } catch (err) {
        if (err.code === 'P2002') {
            throw { status: 409, message: `A project with slug "${data.slug}" already exists` };
        }
        throw err;
    }
};

const update = async (id, input) => {
    const data = pickProjectFields(input);
    try {
        return await prisma.project.update({ where: { id }, data });
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'Project not found' };
        if (err.code === 'P2002') throw { status: 409, message: 'Slug already in use' };
        throw err;
    }
};

const toggleActive = async (id) => {
    const existing = await prisma.project.findUnique({ where: { id }, select: { is_active: true } });
    if (!existing) throw { status: 404, message: 'Project not found' };
    return prisma.project.update({ where: { id }, data: { is_active: !existing.is_active } });
};

const remove = async (id) => {
    try {
        await prisma.project.delete({ where: { id } });
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'Project not found' };
        throw err;
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
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw { status: 404, message: 'Project not found' };

    const data = pickAccomplishmentFields(input);
    if (!data.title) throw { status: 400, message: 'title is required' };

    return prisma.accomplishment.create({ data: { ...data, project_id: projectId } });
};

const updateAccomplishment = async (id, input) => {
    const data = pickAccomplishmentFields(input);
    try {
        return await prisma.accomplishment.update({ where: { id }, data });
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'Accomplishment not found' };
        throw err;
    }
};

const deleteAccomplishment = async (id) => {
    try {
        await prisma.accomplishment.delete({ where: { id } });
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'Accomplishment not found' };
        throw err;
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
