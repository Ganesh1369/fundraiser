# Prisma — schema management for the ICE Fundraiser backend

> Adopted as part of Phase 2.1. Phase 1 code keeps using `mysql2` raw SQL; new Phase 2 code uses `@prisma/client`.

## Files in this folder

- `schema.prisma` — source of truth for the database schema. Models, enums, views.
- `migrations/0_init/migration.sql` — baseline matching production state as of 2026-04-30.
- `migrations/migration_lock.toml` — locks the provider to MySQL/MariaDB.
- This `README.md`.

## One-time setup

### 1. Install deps

```bash
cd fund-raiser-backend
npm install
```

This installs `prisma` (CLI) and `@prisma/client` (runtime). The Prisma client is generated automatically into `node_modules/.prisma/client` via the `@prisma/client` postinstall hook.

### 2. Configure `DATABASE_URL`

Add to `.env`:

```
DATABASE_URL="mysql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Examples:
- Local: `mysql://root:@localhost:3306/fundraiser_db`
- Production: `mysql://u378384838_icefdb_usr:PASSWORD@127.0.0.1:3306/u378384838_icefdb`

The existing `DB_HOST` / `DB_USER` / `DB_PASSWORD` / etc. continue to drive `mysql2` for the Phase 1 code. Both must point at the same database.

### 3. Mark the production DB as baselined

The prod DB already has the schema; we don't want to re-run the baseline DDL on it. Mark `0_init` as already-applied:

```bash
npx prisma migrate resolve --applied "0_init"
```

Run this **once**, against production and against any existing dev DB. After that, `prisma migrate status` should show "Database schema is up to date!"

### 4. Generate the client

```bash
npx prisma generate
```

(Done automatically by `npm install` going forward.)

## Day-to-day workflow

### Adding a new schema change

1. Edit `prisma/schema.prisma`.
2. Generate the migration SQL without applying it:
   ```bash
   npx prisma migrate dev --name <short_description> --create-only
   ```
   This creates `prisma/migrations/<timestamp>_<short_description>/migration.sql`.
3. Review the generated SQL. Edit it if the inferred DDL isn't what you want.
4. Apply locally:
   ```bash
   npx prisma migrate dev
   ```
5. Commit `schema.prisma` and the new migration folder together.

### Deploying to staging / prod

```bash
git pull
npm install                       # regenerates client if schema.prisma changed
npx prisma migrate deploy         # applies any pending migrations
pm2 reload fundraiser-api
```

### Inspecting the DB

```bash
npx prisma studio                 # GUI on http://localhost:5555
```

## Conventions

- **Never** edit a previously-committed migration file. Add a new one.
- **Always** review the generated SQL before committing — Prisma's inference is good but not perfect, especially around indexes, FK names, and check constraints.
- Keep `db-schema/schema.sql` in sync with `schema.prisma` for documentation purposes (the SQL file is no longer authoritative, but is helpful for DBA review).
- Existing services in `src/services/*.js` use raw `mysql2` queries via `db.query(...)`. Do not refactor them as part of Phase 2.1 — only new Phase 2 services use Prisma client.

## Coexistence with `mysql2`

Phase 1 services use `db.query(...)` (returns `{ rows, rowCount, fields }`). Phase 2 services use `prisma.<model>.<verb>(...)`. Both hit the same MariaDB instance. Be aware:

- Prisma manages its own connection pool. You'll have two pools open concurrently. Tune `DB_POOL_SIZE` (mysql2) and the Prisma `connection_limit` URL parameter together.
- Long-running transactions in Prisma should use `prisma.$transaction(...)`. Don't mix Prisma + mysql2 in a single transaction.

## Troubleshooting

| Symptom | Action |
|---------|--------|
| `prisma migrate status` says drift detected | Compare schema with `prisma db pull` output; reconcile manually. Don't run `migrate reset` against prod. |
| Generated client out of date | `npx prisma generate` |
| `0_init` migration was applied accidentally on prod | Roll back (drop the schema or restore from backup). The baseline DDL conflicts with existing tables. |
| `DATABASE_URL` connection error | Confirm credentials, host, port. MariaDB on Hostinger uses `127.0.0.1:3306` from the same host. |
