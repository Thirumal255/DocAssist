# 🏠 Local Development Setup Guide

Complete guide to set up DocAssist on your local machine.

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **PostgreSQL 15+** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **Android Studio** (for emulator) OR **Expo Go** app on your phone

---

## 📦 Step 1: Install PostgreSQL

### Mac (using Homebrew)
```bash
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb docassist_dev
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb docassist_dev
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Windows
1. Download installer from https://www.postgresql.org/download/windows/
2. Run installer, note the password you set
3. Open pgAdmin and create database `docassist_dev`

### Verify PostgreSQL is running
```bash
psql -U postgres -c "SELECT version();"
```

---

## 🔧 Step 2: Backend Setup

```bash
cd docassist/backend

# Install dependencies
npm install

# Copy environment file
cp .env.development .env

# Edit .env if needed (default settings work for local postgres)
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/docassist_dev"
```

### Initialize Database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed with test data
npm run db:seed
```

### Start Backend
```bash
npm run dev

# You should see:
# 🚀 DocAssist API running on port 3000
# 📍 Health check: http://localhost:3000/health
```

### Verify Backend
```bash
# Health check
curl http://localhost:3000/health

# Test login (after seeding)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dr.sharma@docassist.in","password":"doctor123"}'
```

---

## 📱 Step 3: Mobile App Setup

```bash
cd docassist/mobile

# Install dependencies
npm install

# Copy environment file
cp .env.development .env
```

### For Emulator Testing
```bash
# Start Expo
npx expo start

# Press 'a' for Android emulator
```

### For Physical Device Testing
1. Find your computer's IP address:
   ```bash
   # Mac/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Update `.env`:
   ```
   EXPO_PUBLIC_API_URL=http://YOUR_IP_ADDRESS:3000
   ```

3. Install **Expo Go** app on your phone

4. Start Expo and scan QR code:
   ```bash
   npx expo start
   ```

---

## 🧪 Step 4: Test the App

### Test Credentials (from seed data)
| Role | Email | Password |
|------|-------|----------|
| Doctor | dr.sharma@docassist.in | doctor123 |
| Admin | admin@docassist.in | admin123 |

### Quick Test Flow
1. Open app → Login screen appears
2. Enter doctor credentials → Dashboard loads
3. See 3 sample appointments in queue
4. Tap "Patients" → See 3 sample patients
5. Tap a patient → See patient history
6. Tap "New Rx" → Prescription screen with AI

---

## 🔑 Step 5: Get OpenAI API Key (for AI features)

1. Go to https://platform.openai.com/
2. Sign up / Login
3. Go to API Keys → Create new key
4. Copy key to `.env`:
   ```
   OPENAI_API_KEY=sk-your-key-here
   ```

**Note:** AI features work without the key - they'll just return empty suggestions.

---

## 📂 Project Structure

```
docassist/
├── backend/
│   ├── .env                 # ← Your local config
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Test data
│   └── src/
│       ├── routes/          # API endpoints
│       ├── services/        # Business logic
│       └── middleware/      # Auth, etc.
│
└── mobile/
    ├── .env                 # ← Your local config
    ├── app/                 # Screens (Expo Router)
    ├── components/          # UI components
    ├── api/                 # API client
    └── store/               # State management
```

---

## 🐛 Troubleshooting

### "Cannot connect to database"
```bash
# Check if PostgreSQL is running
pg_isready

# Check connection
psql -U postgres -d docassist_dev -c "SELECT 1"
```

### "Network error" on mobile
- Make sure backend is running (`npm run dev`)
- Use your IP address, not `localhost`
- Phone and computer must be on same WiFi

### "Module not found"
```bash
# Regenerate Prisma client
cd backend && npm run db:generate

# Clear Expo cache
cd mobile && npx expo start -c
```

### Fonts not loading
The app may show warnings about fonts. For now, the system fonts will be used as fallback. To fix properly, download DM Sans and DM Serif Display fonts to `mobile/assets/fonts/`.

---

## 🚀 Next Steps

Once local dev is working:
1. Build out remaining features
2. Add more medicines to database
3. Implement PDF generation
4. Set up production environment (see DEPLOYMENT.md)

---

## 📞 Quick Commands Reference

```bash
# Backend
cd backend
npm run dev          # Start dev server
npm run db:push      # Push schema changes
npm run db:seed      # Reset and seed data
npm run db:studio    # Open Prisma Studio (DB GUI)

# Mobile
cd mobile
npx expo start       # Start Expo
npx expo start -c    # Start with cache clear
npx expo start --android  # Direct to Android
```
