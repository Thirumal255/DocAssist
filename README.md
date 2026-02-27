# DocAssist - Doctor Workflow Management App

A mobile-first Android application designed to streamline the daily workflows of doctors and hospital administrators in India. Built with Expo React Native, Node.js, and PostgreSQL.

## 🩺 Features

- **Authentication** - Role-based login for Doctors and Admins via Firebase
- **Dashboard** - Daily stats, appointment queue, quick actions
- **Patient Management** - Complete patient profiles, visit history, vitals tracking
- **Prescription Writing** - Indian medicine database, AI-assisted suggestions via Gemini
- **Appointment Scheduling** - Calendar view, SMS reminders, status management
- **AI Clinical Support** - Gemini-powered drug suggestions based on diagnosis and history
- **PDF Generation** - Prescription printing with clinic letterhead

## 📱 Screenshots

| Login | Dashboard | Prescription | Patient History |
|-------|-----------|--------------|-----------------|
| Role switcher, secure auth | Stats, queue, quick actions | AI suggestions, medicine search | Timeline, vitals, tabs |

## 🛠 Tech Stack

### Mobile (Expo React Native)
- **Framework**: Expo SDK 51 with TypeScript
- **Navigation**: Expo Router v3 (file-based)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **UI**: Custom components with DM Sans / DM Serif Display fonts

### Backend (Node.js)
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Auth**: Firebase Admin SDK + JWT
- **AI**: Google Gemini 1.5 Flash API

### Infrastructure
- **Hosting**: Google Cloud Run
- **Storage**: Supabase Storage (PDFs)
- **SMS**: Fast2SMS (India)

## 📁 Project Structure

```
docassist/
├── mobile/                 # Expo React Native app
│   ├── app/               # Expo Router screens
│   │   ├── (auth)/        # Login screens
│   │   └── (app)/         # Main app tabs
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Button, Input, Card, Badge, Avatar
│   │   └── cards/        # StatCard, AppointmentCard, etc.
│   ├── store/            # Zustand stores
│   ├── api/              # API client and hooks
│   ├── constants/        # Theme, colors, typography
│   └── types/            # TypeScript definitions
│
├── backend/               # Node.js Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   └── middleware/   # Auth, validation
│   └── prisma/           # Database schema
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for emulator) or Expo Go app
- PostgreSQL database (Supabase recommended)
- Firebase project (for auth)

### Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npx expo start

# Run on Android
npx expo start --android
```

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

Create `.env` files based on `.env.example`:

**Backend (.env)**
```env
DATABASE_URL="postgresql://..."
FIREBASE_PROJECT_ID="your-project"
GEMINI_API_KEY="your-key"
JWT_SECRET="your-secret"
```

**Mobile (.env)**
```env
EXPO_PUBLIC_API_URL="http://localhost:3000"
```

## 📊 Database Schema

Key tables:
- `users` - Doctors and Admins
- `patients` - Patient master records
- `appointments` - Scheduling
- `visits` - Visit records with vitals
- `prescriptions` - Prescription headers
- `prescription_items` - Individual drugs
- `medicines` - Indian drug database (1 lakh+ entries)

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/login` | POST | Firebase token verification |
| `/patients` | GET/POST | List/create patients |
| `/patients/:id/history` | GET | Patient visit history |
| `/appointments` | GET/POST | List/create appointments |
| `/prescriptions` | POST | Create prescription |
| `/medicines/search` | GET | Search Indian drug database |
| `/ai/suggest` | POST | Get AI prescription suggestions |

## 🗓 Development Phases

1. **Phase 1** (Weeks 1-3): Foundation & Authentication ✅
2. **Phase 2** (Weeks 4-7): Patient & Appointment Management
3. **Phase 3** (Weeks 8-11): Prescription Engine + Medicine Database
4. **Phase 4** (Weeks 12-15): AI Suggestions + Notifications
5. **Phase 5** (Weeks 16-20): Polish, Testing & Deployment

## 🇮🇳 Indian Medicine Database

This app uses a self-hosted Indian medicine database instead of OpenFDA, covering:
- 1 lakh+ branded and generic Indian drugs
- Indian Pharmacopoeia (IP) naming
- CDSCO/NPPA approved medicines

Sources:
- [junioralive/Indian-Medicine-Dataset](https://github.com/junioralive/Indian-Medicine-Dataset)
- NPPA (National Pharmaceutical Pricing Authority)
- data.gov.in Open Government Data

## 🔒 Security

- Firebase Authentication with short-lived JWT tokens
- Role-based access control
- HTTPS enforced (Cloud Run TLS)
- Patient PII never sent to AI API
- Prisma parameterized queries (SQL injection prevention)
- API key storage in Google Cloud Secret Manager

## 📄 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

Built with ❤️ for Indian healthcare
