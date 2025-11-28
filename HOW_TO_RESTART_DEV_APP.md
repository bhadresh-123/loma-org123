# How to Restart the Development App

## Quick Reference

### Standard Development Server Restart

```bash
# Stop the current server (Ctrl+C if running)
# Then restart:
npm run dev
```

### After Making Database Schema Changes

When you've modified `db/schema.ts` or `db/schema-hipaa-refactored.ts`:

```bash
# 1. Apply database migrations
npx drizzle-kit push

# 2. (Optional) Seed data if needed
npx tsx db/scripts/seed-document-templates.ts
# or other seed scripts

# 3. Restart the dev server
npm run dev
```

## Detailed Process

### 1. Stop the Current Server

If the server is running:
- **In Terminal:** Press `Ctrl+C` to stop
- **Background Process:** Find and kill the process:
  ```bash
  # Find the process
  lsof -i :5000
  
  # Kill it (replace PID with actual process ID)
  kill -9 <PID>
  ```

### 2. Apply Database Changes (If Needed)

#### Option A: Using Drizzle Kit Push (Recommended for Dev)

```bash
npx drizzle-kit push
```

This will:
- Compare your schema with the database
- Generate and apply SQL changes
- Prompt for confirmation on destructive changes

#### Option B: Using Migration Files (Recommended for Production)

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit migrate
```

#### Option C: Manual SQL Application

```bash
# If you have a specific migration file
psql $DATABASE_URL -f db/migrations-hipaa/0005_add_documents_tables.sql
```

### 3. Seed Data (When Applicable)

For the documents feature:

```bash
npx tsx db/scripts/seed-document-templates.ts
```

For other features:
```bash
# Medical codes
npx tsx db/scripts/seed-medical-codes.ts

# Or run custom SQL
psql $DATABASE_URL -f db/scripts/seed-data.sql
```

### 4. Start the Development Server

```bash
npm run dev
```

The server will start on:
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:5173 (or configured port)

## Common Scenarios

### After Pulling New Code

```bash
# 1. Install any new dependencies
npm install

# 2. Apply any schema changes
npx drizzle-kit push

# 3. Run seeds if needed
npx tsx db/scripts/seed-document-templates.ts

# 4. Start the server
npm run dev
```

### After Creating New API Routes

No database changes needed, just restart:

```bash
npm run dev
```

### After Modifying Environment Variables

```bash
# 1. Update .env file or env.development

# 2. Restart server
npm run dev
```

### Clean Restart (Nuclear Option)

If things are really broken:

```bash
# 1. Stop all Node processes
pkill -f node

# 2. Clear node modules
rm -rf node_modules
npm install

# 3. Reset database (CAUTION: DESTROYS DATA)
# Only do this in development!
npx drizzle-kit drop
npx drizzle-kit push

# 4. Reseed data
npx tsx db/scripts/seed-document-templates.ts

# 5. Start fresh
npm run dev
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=5001 npm run dev
```

### Database Connection Errors

```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# If not set, source your environment file
source .env.development

# Or set it manually
export DATABASE_URL="postgresql://..."
```

### Migration Conflicts

```bash
# If drizzle-kit push shows conflicts:

# Option 1: Accept the changes
# Follow the prompts, usually select "No, add without truncating"

# Option 2: Reset and reapply (DEV ONLY!)
npx drizzle-kit drop
npx drizzle-kit push
```

### TypeScript Errors After Schema Changes

```bash
# Regenerate TypeScript types
npx drizzle-kit generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P -> "TypeScript: Restart TS Server"
```

### Frontend Not Reflecting Changes

```bash
# Clear build cache
rm -rf dist .vite

# Restart dev server
npm run dev
```

## Production Deployment

**Never use `drizzle-kit push` in production!** Use migrations instead:

```bash
# 1. Generate migration locally
npx drizzle-kit generate

# 2. Commit the migration file
git add db/migrations-hipaa/*.sql
git commit -m "Add migration"

# 3. On production server:
npx drizzle-kit migrate

# 4. Restart the production app
pm2 restart loma-app
# or
systemctl restart loma-app
```

## Useful Scripts

Add these to `package.json` for convenience:

```json
{
  "scripts": {
    "dev": "vite",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:drop": "drizzle-kit drop",
    "db:studio": "drizzle-kit studio",
    "seed:templates": "tsx db/scripts/seed-document-templates.ts",
    "seed:medical-codes": "tsx db/scripts/seed-medical-codes.ts",
    "dev:fresh": "npm run db:push && npm run seed:templates && npm run dev"
  }
}
```

Then you can use:

```bash
# Quick restart with database update
npm run dev:fresh

# Just update database
npm run db:push

# Open database GUI
npm run db:studio
```

## Environment-Specific Commands

### Development

```bash
npm run dev
```

### Staging

```bash
NODE_ENV=staging npm start
```

### Production

```bash
NODE_ENV=production pm2 start npm --name "loma-app" -- start
```

## Monitoring Logs

### Development

Logs appear directly in terminal

### Production

```bash
# View logs
pm2 logs loma-app

# View last 100 lines
pm2 logs loma-app --lines 100

# Follow logs in real-time
pm2 logs loma-app --lines 0
```

## Quick Commands Cheat Sheet

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Stop dev server | `Ctrl+C` |
| Apply schema changes | `npx drizzle-kit push` |
| Generate migration | `npx drizzle-kit generate` |
| Run migration | `npx drizzle-kit migrate` |
| Seed templates | `npx tsx db/scripts/seed-document-templates.ts` |
| View database | `npx drizzle-kit studio` |
| Check port usage | `lsof -i :5000` |
| Kill process | `kill -9 <PID>` |
| Install dependencies | `npm install` |
| Clear cache | `rm -rf node_modules dist .vite && npm install` |

## After This Specific Implementation

For the documents feature you just implemented:

```bash
# 1. Apply the schema (creates document tables)
npx drizzle-kit push

# 2. Seed the 5 default templates
npx tsx db/scripts/seed-document-templates.ts

# 3. Restart server
npm run dev

# 4. Test in browser
# Navigate to http://localhost:5173/documents
# Should see no 404 errors and 5 templates available
```

## Pro Tips

1. **Use `drizzle-kit studio`** to visually inspect your database changes
2. **Always commit migration files** before deploying to production
3. **Test migrations on staging first** before production
4. **Keep seed scripts idempotent** (safe to run multiple times)
5. **Use `--force` flags carefully** - they can destroy data
6. **Set up database backups** before major migrations
7. **Document any manual SQL** that needs to run with deployments

## Need Help?

- Check `server.log` for backend errors
- Check browser console for frontend errors  
- Run `npm run db:studio` to inspect database state
- Check if environment variables are set: `env | grep DATABASE`

