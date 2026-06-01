const prisma = require('../config/prisma');

const CSR_FIELDS = [
    'title', 'subtitle', 'partner_name', 'logo_url', 'hero_image_url',
    'summary', 'link_url', 'display_order', 'is_active'
];

const pickFields = (input) => {
    const data = {};
    for (const k of CSR_FIELDS) {
        if (input[k] !== undefined) data[k] = input[k];
    }
    return data;
};

const listActive = async () => {
    return prisma.csrActivity.findMany({
        where: { is_active: true },
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }]
    });
};

const listAllForAdmin = async () => {
    return prisma.csrActivity.findMany({
        orderBy: [{ display_order: 'asc' }, { created_at: 'desc' }]
    });
};

const getByIdForAdmin = async (id) => {
    const row = await prisma.csrActivity.findUnique({ where: { id } });
    if (!row) throw { status: 404, message: 'CSR activity not found' };
    return row;
};

const create = async (input) => {
    const data = pickFields(input);
    if (!data.title) throw { status: 400, message: 'title is required' };
    return prisma.csrActivity.create({ data });
};

const update = async (id, input) => {
    const data = pickFields(input);
    try {
        return await prisma.csrActivity.update({ where: { id }, data });
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'CSR activity not found' };
        throw err;
    }
};

const toggleActive = async (id) => {
    const existing = await prisma.csrActivity.findUnique({ where: { id }, select: { is_active: true } });
    if (!existing) throw { status: 404, message: 'CSR activity not found' };
    return prisma.csrActivity.update({ where: { id }, data: { is_active: !existing.is_active } });
};

const remove = async (id) => {
    try {
        await prisma.csrActivity.delete({ where: { id } });
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'CSR activity not found' };
        throw err;
    }
};

/**
 * Atomically reassign display_order for a set of CSR activities.
 * Body shape: [{ id, display_order }, ...]. Unknown ids are rejected (transaction rolls back).
 */
const reorder = async (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        throw { status: 400, message: 'items array is required' };
    }
    for (const it of items) {
        if (!it || typeof it.id !== 'string' || typeof it.display_order !== 'number') {
            throw { status: 400, message: 'each item needs { id: string, display_order: number }' };
        }
    }
    try {
        await prisma.$transaction(
            items.map(it => prisma.csrActivity.update({
                where: { id: it.id },
                data: { display_order: it.display_order }
            }))
        );
    } catch (err) {
        if (err.code === 'P2025') throw { status: 404, message: 'One or more CSR activities not found' };
        throw err;
    }
    return { updated: items.length };
};

module.exports = {
    listActive, listAllForAdmin, getByIdForAdmin,
    create, update, toggleActive, remove, reorder
};
