// Prisma client singleton — used by Phase 2 services.
// Phase 1 services continue to use src/config/db.js (mysql2 raw queries).
// Both pools point at the same DB; tune sizes together if connection limits become an issue.

const { PrismaClient } = require('@prisma/client');

const isDev = (process.env.NODE_ENV || 'development') === 'development';

const prisma = global.__prisma ?? new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error']
});

if (isDev) {
    global.__prisma = prisma;
}

module.exports = prisma;
