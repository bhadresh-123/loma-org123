# 🚀 Quick Start Guide - LOMA Project

## Project Location
```
E:\Bhadresh\LOMA\loma-org
```

## 📋 Prerequisites Check

Before running the project, ensure you have:

- ✅ **Node.js 20.x or higher** - Check with: `node --version`
- ✅ **PostgreSQL 16.x** or **Neon Database** account
- ✅ **npm** installed - Check with: `npm --version`

## 🎯 Quick Setup (One-Time)

### Option 1: Automated Setup Script
```powershell
# Run the setup script
.\setup-project.ps1
```

### Option 2: Manual Setup

1. **Create .env file:**
   ```powershell
   Copy-Item env.development .env
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Edit .env file** - Update these required variables:
   - `DATABASE_URL` - Your PostgreSQL connection string
   - `PHI_ENCRYPTION_KEY` - 32 character hex key (generate with: `openssl rand -hex 32`)
   - `SESSION_SECRET` - Random secret string
   - `STRIPE_SECRET_KEY` - Your Stripe test key (get from Stripe dashboard)

4. **Setup database schema:**
   ```powershell
   npm run db:hipaa:push
   ```

## ▶️ Running the Project

### Start Development Server
```powershell
npm run dev
```

The application will be available at: **http://localhost:5000**

### Restart Development Server (if needed)
```powershell
npm run dev:restart
```

### View Logs
```powershell
# View live logs
Get-Content dev.log -Wait -Tail 50
```

## 📝 Important Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run dev:restart` | Restart dev server cleanly |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:hipaa:push` | Push database schema to database |
| `npm test` | Run tests |
| `npm run lint` | Run linter |

## 🔧 Environment Variables

### Required Variables in `.env`:

```env
# Database (REQUIRED)
DATABASE_URL=postgresql://username:password@host:port/database

# Encryption (REQUIRED for HIPAA)
PHI_ENCRYPTION_KEY=your-32-character-hex-key-here

# Session (REQUIRED)
SESSION_SECRET=your-random-secret-string

# Stripe (Required for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Generate Encryption Key:
```powershell
# Generate 32 character hex key for PHI_ENCRYPTION_KEY
openssl rand -hex 32
```

## 🗄️ Database Setup

1. **Create PostgreSQL database** (or use Neon Database)
2. **Update DATABASE_URL** in `.env` file
3. **Push schema:**
   ```powershell
   npm run db:hipaa:push
   ```

## 🐛 Troubleshooting

### Port Already in Use
If port 5000 is already in use:
- Change `BASE_URL` in `.env` to use a different port
- Or stop the process using port 5000

### Database Connection Error
- Check `DATABASE_URL` in `.env` file
- Ensure PostgreSQL is running
- Verify database credentials

### Module Not Found Errors
- Delete `node_modules` folder
- Delete `package-lock.json`
- Run: `npm install`

### Dependencies Installation Issues
```powershell
# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

## 📚 More Information

- Full documentation: See `README.md`
- API Reference: See `API_REFERENCE.md`
- Deployment guide: See `DEPLOYMENT_INSTRUCTIONS.md`

## 🆘 Need Help?

- Check logs: `Get-Content dev.log -Wait -Tail 50`
- Verify setup: `npm run verify:ai-setup`
- Review README.md for detailed information

---

**Note:** This project handles Protected Health Information (PHI) and requires HIPAA compliance. Ensure proper security configuration before using in production.


