const prisma = require('../config/prisma');

const projectInclude = {
    accomplishments: {
        orderBy: [{ display_order: 'asc' }, { created_at: 'asc' }]
    }
};

const listActive = async () => {
    return prisma.project.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { name: 'asc' }]
    });
};

const getBySlug = async (slug) => {
    const project = await prisma.project.findUnique({
        where: { slug },
        include: projectInclude
    });
    if (!project || !project.is_active) {
        throw { status: 404, message: 'Project not found' };
    }
    return project;
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
