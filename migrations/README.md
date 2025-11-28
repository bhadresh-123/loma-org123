# Migrations Directory

**Note:** This directory contains only Drizzle Kit metadata for migration tracking.

## Active Migrations

All active database migrations are located in:
- **`/db/migrations-hipaa/`** - PostgreSQL HIPAA-compliant schema migrations

## Migration Commands

- Generate migrations: `npm run db:hipaa:generate`
- Push migrations: `npm run db:hipaa:push`
- Run migrations: `npm run migrate:hipaa`

## Configuration

Migrations are configured in:
- `drizzle.config.hipaa.ts` - HIPAA schema configuration (PostgreSQL)
- `drizzle.config.ts` - Standard configuration (PostgreSQL)

---

**Legacy Note:** The `drizzle.dev.config.ts` (SQLite) has been removed as the project now uses PostgreSQL exclusively.

