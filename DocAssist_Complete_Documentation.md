# DocAssist - Complete Application Documentation

## 📋 Table of Contents
1. [Application Overview](#1-application-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema)
5. [Project Structure](#5-project-structure)
6. [Backend Details](#6-backend-details)
7. [Mobile App Details](#7-mobile-app-details)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [API Endpoints](#9-api-endpoints)
10. [Screen Flows](#10-screen-flows)
11. [Setup Instructions](#11-setup-instructions)

---

## 1. Application Overview

**DocAssist** is a mobile-first Android application for doctor workflow management in Indian clinics/hospitals.

### Key Features
- **Appointment Management**: Schedule, reschedule, cancel appointments with 15-minute slots
- **Patient Management**: Complete patient profiles with medical history
- **Prescription Writing**: AI-assisted prescription with Indian medicine database (1 lakh+ medicines)
- **Role-Based Access**: Separate workflows for Doctors and Admin staff
- **Visit History**: Timeline view of all patient visits and prescriptions

### User Roles
| Role | Capabilities |
|------|-------------|
| **Admin** | Manage all patients, all appointments, all doctors' availability, view all records. Cannot write prescriptions. |
| **Doctor** | View only their patients (with appointments/visits), write prescriptions, manage own availability |

---

## 2. Technology Stack

### Frontend (Mobile)
| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | SDK 54 | React Native framework |
| React Native | 0.76.x | Mobile UI |
| Expo Router | v4 | File-based navigation |
| TypeScript | 5.x | Type safety |
| Zustand | 4.x | State management |
| Axios | 1.x | HTTP client |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime |
| Express.js | 4.x | REST API framework |
| Prisma | 6.x | ORM |
| PostgreSQL | 15 | Database (via Supabase) |
| Firebase Auth | - | Authentication |
| TypeScript | 5.x | Type safety |

### External Services
| Service | Purpose |
|---------|---------|
| Firebase Authentication | User login, JWT tokens |
| Supabase | PostgreSQL hosting |
| Google Gemini 1.5 Flash | AI clinical suggestions |
| Fast2SMS | SMS notifications (India) |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo React Native)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Screens │  │   API    │  │  Store   │  │    Components    │ │
│  │ (Router) │  │ (Axios)  │  │(Zustand) │  │   (Reusable)     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼─────────────┼─────────────────┼───────────┘
        │             │             │                 │
        └─────────────┴─────────────┴─────────────────┘
                              │
                    HTTPS (REST API)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Routes  │  │Middleware│  │ Services │  │     Prisma       │ │
│  │ (REST)   │  │  (Auth)  │  │(Business)│  │     (ORM)        │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘ │
└───────┼─────────────┼─────────────┼─────────────────┼───────────┘
        │             │             │                 │
        └─────────────┴─────────────┴─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐ │
│  │ Users  │ │Patients│ │ Appts  │ │ Visits │ │ Prescriptions  │ │
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Database Schema

### Entity Relationship

```
User (doctor/admin)
  │
  ├──< Appointment >── Patient
  │
  ├──< Visit >── Patient
  │       │
  │       └──< Prescription
  │               │
  │               └──< PrescriptionItem
  │
  └──< DoctorAvailability
  
Medicine (standalone lookup table)
```

### Tables

#### `User`
```prisma
model User {
  id            String    @id @default(uuid())
  firebaseUid   String    @unique
  email         String    @unique
  name          String
  role          Role      @default(doctor)  // 'doctor' | 'admin'
  specialty     String?
  phone         String?
  registrationNo String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  appointments  Appointment[]
  visits        Visit[]
  availability  DoctorAvailability[]
}
```

#### `Patient`
```prisma
model Patient {
  id                String    @id @default(uuid())
  name              String
  phone             String
  email             String?
  dob               DateTime
  gender            String    // 'male' | 'female' | 'other'
  bloodGroup        String?
  address           String?
  allergies         String[]  // Array of allergy names
  chronicConditions String[]  // Array of conditions
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  appointments      Appointment[]
  visits            Visit[]
}
```

#### `Appointment`
```prisma
model Appointment {
  id              String    @id @default(uuid())
  patientId       String
  doctorId        String
  scheduledAt     DateTime
  status          AppointmentStatus @default(scheduled)
  type            AppointmentType   @default(new_visit)
  chiefComplaint  String?
  notes           String?
  rescheduledFrom DateTime?
  cancelReason    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  patient         Patient   @relation(...)
  doctor          User      @relation(...)
}

enum AppointmentStatus {
  scheduled, checked_in, consulting, completed, cancelled, no_show
}

enum AppointmentType {
  new_visit, follow_up, emergency
}
```

#### `Visit`
```prisma
model Visit {
  id              String    @id @default(uuid())
  patientId       String
  doctorId        String
  appointmentId   String?   @unique
  visitedAt       DateTime  @default(now())
  chiefComplaint  String?
  diagnosis       String?
  notes           String?
  vitals          Json?     // { bp, pulse, temperature, weight, spo2 }
  createdAt       DateTime  @default(now())
  
  patient         Patient       @relation(...)
  doctor          User          @relation(...)
  appointment     Appointment?  @relation(...)
  prescription    Prescription?
}
```

#### `Prescription`
```prisma
model Prescription {
  id              String    @id @default(uuid())
  visitId         String    @unique
  diagnosis       String?
  notes           String?
  pdfUrl          String?
  aiSuggestionUsed Boolean  @default(false)
  createdAt       DateTime  @default(now())
  
  visit           Visit     @relation(...)
  items           PrescriptionItem[]
}
```

#### `PrescriptionItem`
```prisma
model PrescriptionItem {
  id              String    @id @default(uuid())
  prescriptionId  String
  medicineName    String
  genericName     String?
  dose            String    // e.g., "500mg"
  frequency       String    // e.g., "1-0-1"
  duration        String    // e.g., "7 days"
  instructions    String?   // e.g., "After food"
  
  prescription    Prescription @relation(...)
}
```

#### `DoctorAvailability`
```prisma
model DoctorAvailability {
  id            String    @id @default(uuid())
  doctorId      String
  dayOfWeek     Int       // 0=Sunday, 1=Monday, etc.
  startTime     String    // "09:00"
  endTime       String    // "17:00"
  slotDuration  Int       @default(15)  // minutes
  isActive      Boolean   @default(true)
  
  doctor        User      @relation(...)
  
  @@unique([doctorId, dayOfWeek, startTime])
}
```

#### `Medicine`
```prisma
model Medicine {
  id            String    @id @default(uuid())
  brandName     String
  genericName   String?
  manufacturer  String?
  strength      String?
  form          String?   // tablet, capsule, syrup, etc.
  mrp           Float?
  category      String?
}
```

---

## 5. Project Structure

```
D:\Personal_Data\Projects_Self\DocAssist\
│
├── backend/                          # Node.js Express API
│   ├── src/
│   │   ├── index.ts                  # Express app entry point
│   │   ├── routes/
│   │   │   ├── auth.ts               # POST /login, GET /me
│   │   │   ├── patients.ts           # CRUD patients + history
│   │   │   ├── appointments.ts       # CRUD appointments + stats
│   │   │   ├── prescriptions.ts      # CRUD prescriptions
│   │   │   ├── medicines.ts          # GET /search medicine lookup
│   │   │   ├── availability.ts       # Doctor schedule management
│   │   │   └── users.ts              # GET /doctors list
│   │   ├── middleware/
│   │   │   └── auth.ts               # JWT verification middleware
│   │   └── services/
│   │       ├── gemini.service.ts     # AI suggestions (future)
│   │       └── sms.service.ts        # Fast2SMS integration (future)
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   ├── seed.ts                   # Seed data for dev
│   │   └── migrations/               # Database migrations
│   ├── .env                          # Environment variables
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/                           # Expo React Native App
│   ├── app/                          # Expo Router screens
│   │   ├── _layout.tsx               # Root layout (auth check)
│   │   ├── index.tsx                 # Entry redirect
│   │   ├── (auth)/                   # Auth group (unauthenticated)
│   │   │   ├── _layout.tsx
│   │   │   └── login.tsx             # Login screen
│   │   └── (app)/                    # App group (authenticated)
│   │       ├── _layout.tsx           # Tab navigator (5 tabs)
│   │       ├── dashboard.tsx         # Home tab
│   │       ├── settings.tsx          # Settings tab
│   │       ├── appointments/         # Schedule tab
│   │       │   ├── _layout.tsx       # Stack navigator
│   │       │   ├── index.tsx         # Appointments list
│   │       │   └── new.tsx           # New appointment wizard
│   │       ├── patients/             # Patients tab
│   │       │   ├── _layout.tsx       # Stack navigator
│   │       │   ├── index.tsx         # Patients list
│   │       │   ├── add.tsx           # Add patient form
│   │       │   ├── [id].tsx          # Patient detail
│   │       │   └── edit/[id].tsx     # Edit patient
│   │       ├── records/              # Records tab
│   │       │   ├── _layout.tsx
│   │       │   └── index.tsx         # Prescriptions list
│   │       ├── prescriptions/        # Hidden from tabs
│   │       │   ├── _layout.tsx
│   │       │   └── new.tsx           # New prescription
│   │       └── admin/                # Hidden from tabs
│   │           ├── _layout.tsx
│   │           ├── users.tsx         # Manage users
│   │           └── manage-availability.tsx
│   ├── api/                          # API client modules
│   │   ├── index.ts                  # Export all APIs
│   │   ├── client.ts                 # Axios instance
│   │   ├── appointments.ts           # Appointments API
│   │   ├── patients.ts               # Patients API
│   │   ├── users.ts                  # Users API
│   │   └── availability.ts           # Availability API
│   ├── store/                        # Zustand state
│   │   ├── index.ts                  # Export stores
│   │   └── auth.ts                   # Auth store (user, token)
│   ├── types/                        # TypeScript types
│   │   └── index.ts                  # All interfaces
│   ├── utils/                        # Utility functions
│   │   └── logger.ts                 # Console logging
│   ├── app.json                      # Expo config
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 6. Backend Details

### Entry Point (`src/index.ts`)
```typescript
// Loads all routes and starts Express server on PORT 3000
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/medicines', medicinesRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/users', usersRoutes);
```

### Auth Middleware (`src/middleware/auth.ts`)
- Verifies Firebase JWT token from `Authorization: Bearer <token>` header
- Attaches `req.user` with user data from database
- Used on all protected routes

### Route Files

#### `routes/auth.ts`
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Verify Firebase token, return user profile |
| `/api/auth/me` | GET | Get current user profile |

#### `routes/patients.ts`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/patients` | GET | Yes | List patients (role-filtered) |
| `/api/patients` | POST | Yes | Create new patient |
| `/api/patients/:id` | GET | Yes | Get patient details |
| `/api/patients/:id` | PUT | Yes | Update patient |
| `/api/patients/:id` | DELETE | Admin | Delete patient |
| `/api/patients/:id/history` | GET | Yes | Get visit history |

**Role Filtering:**
- Admin: Sees all patients
- Doctor: Sees only patients with appointments/visits by this doctor

#### `routes/appointments.ts`
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/appointments` | GET | List appointments (by date, doctor) |
| `/api/appointments` | POST | Create appointment |
| `/api/appointments/today` | GET | Today's appointments |
| `/api/appointments/stats` | GET | Dashboard statistics |
| `/api/appointments/:id` | PUT | Update appointment |
| `/api/appointments/:id/cancel` | POST | Cancel with reason |
| `/api/appointments/:id/reschedule` | POST | Reschedule with new time |

#### `routes/prescriptions.ts`
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/prescriptions` | GET | Yes | List prescriptions (role-filtered) |
| `/api/prescriptions` | POST | Doctor | Create prescription |
| `/api/prescriptions/:id` | GET | Yes | Get prescription details |

**Role Filtering:**
- Admin: Sees all prescriptions, can filter by doctor/patient
- Doctor: Sees only prescriptions they created

#### `routes/availability.ts`
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/availability/:doctorId` | GET | Get doctor's weekly schedule |
| `/api/availability/:doctorId` | POST | Add availability slot |
| `/api/availability/:doctorId/replace-all` | POST | Replace all slots |
| `/api/availability/:doctorId/slots` | GET | Get available time slots for date |

**Slot Generation Logic:**
- Reads `DoctorAvailability` for the day of week
- Generates slots based on `slotDuration` (default 15 min)
- Filters out already booked slots
- For today: filters out elapsed time slots (past current time + 15 min buffer)

#### `routes/medicines.ts`
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/medicines/search` | GET | Search by brand/generic name |

#### `routes/users.ts`
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users/doctors` | GET | List all doctors |

---

## 7. Mobile App Details

### Navigation Structure

```
Root (_layout.tsx)
├── (auth) - Unauthenticated
│   └── login.tsx
│
└── (app) - Authenticated (Tab Navigator)
    ├── dashboard.tsx        [Tab: Home]
    ├── appointments/        [Tab: Schedule]
    │   ├── index.tsx        (List)
    │   └── new.tsx          (Wizard)
    ├── patients/            [Tab: Patients]
    │   ├── index.tsx        (List)
    │   ├── add.tsx          (Form)
    │   ├── [id].tsx         (Detail)
    │   └── edit/[id].tsx    (Edit)
    ├── records/             [Tab: Records]
    │   └── index.tsx        (Prescriptions list)
    ├── settings.tsx         [Tab: Settings]
    ├── prescriptions/       [Hidden]
    │   └── new.tsx
    └── admin/               [Hidden]
        ├── users.tsx
        └── manage-availability.tsx
```

### API Client (`api/client.ts`)
```typescript
// Axios instance with:
// - Base URL from config
// - Auth token injection
// - Request/response logging
// - Error handling
```

### State Management (`store/auth.ts`)
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email, password) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}
```

### Screen Details

#### Dashboard (`dashboard.tsx`)
- Shows greeting with user name
- Stats cards: Today's appointments, Pending, Total patients
- Quick actions (role-based):
  - Admin: New Appointment, Add Patient, Manage Users, Availability
  - Doctor: New Appointment, Add Patient, Write Rx, Reports
- Today's queue (clickable → patient detail)

#### Appointments List (`appointments/index.tsx`)
- Date navigation (prev/next day, tap for today)
- Doctor filter (Admin only)
- Appointment cards with status badges
- Click → Action modal (Reschedule/Cancel)
- Reschedule modal with date picker + slot grid

#### New Appointment (`appointments/new.tsx`)
- 4-step wizard:
  1. Select Doctor
  2. Select Patient (search)
  3. Select Date & Time (slot grid)
  4. Details (type, complaint, notes)
- Handles `patientId` param (skips patient selection)
- Resets state on mount

#### Patients List (`patients/index.tsx`)
- Search by name/phone
- Role-based filtering (Doctor sees only their patients)
- "My Patients" badge for doctors
- Click → Patient detail

#### Patient Detail (`patients/[id].tsx`)
- Header with patient info, stats
- Tabs: History, Vitals, Info
- Timeline view of visits
- Action buttons:
  - Admin: Edit, Appointment
  - Doctor: Edit, Appointment, Write Rx

#### Add Patient (`patients/add.tsx`)
- Form fields: Name, Phone, DOB, Gender, Blood Group
- Medical: Allergies, Chronic Conditions
- Contact: Email, Address

#### Records (`records/index.tsx`)
- Prescriptions list with doctor/patient filters
- Role-based:
  - Admin: All prescriptions, doctor filter
  - Doctor: Only their prescriptions
- Click → Patient detail

#### Settings (`settings.tsx`)
- User profile display
- Role-based links:
  - Admin: Manage Availability
- Logout button

---

## 8. Authentication & Authorization

### Login Flow
```
1. User enters email/password
2. App calls Firebase signInWithEmailAndPassword()
3. Firebase returns ID token
4. App sends token to POST /api/auth/login
5. Backend verifies token with Firebase Admin SDK
6. Backend looks up user in database by firebaseUid
7. Backend returns user profile + role
8. App stores token in SecureStore, user in Zustand
9. App redirects to (app) group
```

### Token Refresh
- Token stored in `expo-secure-store`
- Attached to every API request via Axios interceptor
- If 401 returned, logout and redirect to login

### Role-Based UI
```typescript
const { user } = useAuthStore();
const isAdmin = user?.role === 'admin';
const isDoctor = user?.role === 'doctor';

// Conditional rendering
{isDoctor && <WriteRxButton />}
{isAdmin && <ManageUsersLink />}
```

---

## 9. API Endpoints Summary

| Route | Method | Auth | Admin | Doctor | Description |
|-------|--------|------|-------|--------|-------------|
| `/auth/login` | POST | No | ✓ | ✓ | Login |
| `/auth/me` | GET | Yes | ✓ | ✓ | Current user |
| `/patients` | GET | Yes | All | Own | List patients |
| `/patients` | POST | Yes | ✓ | ✓ | Create patient |
| `/patients/:id` | GET | Yes | ✓ | Own | Patient detail |
| `/patients/:id` | PUT | Yes | ✓ | ✓ | Update patient |
| `/patients/:id` | DELETE | Yes | ✓ | ✗ | Delete patient |
| `/patients/:id/history` | GET | Yes | All | Own | Visit history |
| `/appointments` | GET | Yes | All | Own | List appointments |
| `/appointments` | POST | Yes | ✓ | ✓ | Create appointment |
| `/appointments/today` | GET | Yes | ✓ | ✓ | Today's list |
| `/appointments/stats` | GET | Yes | ✓ | ✓ | Dashboard stats |
| `/appointments/:id/cancel` | POST | Yes | ✓ | ✓ | Cancel |
| `/appointments/:id/reschedule` | POST | Yes | ✓ | ✓ | Reschedule |
| `/prescriptions` | GET | Yes | All | Own | List prescriptions |
| `/prescriptions` | POST | Yes | ✗ | ✓ | Create prescription |
| `/medicines/search` | GET | Yes | ✓ | ✓ | Search medicines |
| `/availability/:doctorId` | GET | Yes | ✓ | Own | Get schedule |
| `/availability/:doctorId/slots` | GET | Yes | ✓ | ✓ | Get time slots |
| `/users/doctors` | GET | Yes | ✓ | ✓ | List doctors |

---

## 10. Screen Flows

### Booking Appointment (Admin)
```
Dashboard → "New Appointment" 
  → Step 1: Select Doctor 
  → Step 2: Search & Select Patient 
  → Step 3: Pick Date → Pick Time Slot 
  → Step 4: Select Type, Enter Complaint 
  → "Schedule Appointment" 
  → Success → Back to Appointments List
```

### Booking Appointment (From Patient Detail)
```
Patient Detail → "Appointment" button
  → Step 1: Select Doctor (patient pre-filled, locked)
  → Step 3: Pick Date → Pick Time Slot
  → Step 4: Details
  → Success
```

### Writing Prescription (Doctor)
```
Dashboard → Today's Queue → Click Patient
  → Patient Detail → "Write Rx" button
  → New Prescription screen
  → Enter Diagnosis
  → Search & Add Medicines
  → (Optional) View AI Suggestions
  → "Save Prescription"
  → Success
```

### Rescheduling Appointment
```
Appointments List → Click Appointment
  → Action Modal → "Reschedule"
  → Reschedule Modal
  → Pick New Date → Pick New Time Slot
  → Enter Reason (optional)
  → "Reschedule" button
  → Success → List refreshes
```

---

## 11. Setup Instructions

### Prerequisites
- Node.js 20 LTS
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android device or emulator with Expo Go app
- PostgreSQL database (Supabase free tier)
- Firebase project with Authentication enabled

### Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your values:
# DATABASE_URL=postgresql://...
# FIREBASE_PROJECT_ID=...
# FIREBASE_PRIVATE_KEY=...
# FIREBASE_CLIENT_EMAIL=...

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed

# Start server
npm run dev
# Server runs on http://localhost:3000
```

### Mobile Setup
```bash
cd mobile

# Install dependencies
npm install

# Create config file
# Edit config/index.ts with your backend URL

# Start Expo
npx expo start

# Scan QR code with Expo Go app on Android
```

### Test Credentials (from seed)
| Email | Password | Role |
|-------|----------|------|
| admin@docassist.com | admin123 | admin |
| dr.sharma@hospital.in | doctor123 | doctor |
| dr.patel@hospital.in | doctor123 | doctor |

---

## Environment Variables

### Backend (.env)
```env
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
```

### Mobile (config/index.ts)
```typescript
export const config = {
  apiUrl: 'http://192.168.1.X:3000/api', // Your backend IP
};
```

---

## Key Implementation Notes

1. **Expo Router v4**: Uses file-based routing with groups `(auth)` and `(app)`
2. **Role-based queries**: Backend filters data based on `req.user.role`
3. **15-minute slots**: Default appointment duration, configurable per doctor
4. **Elapsed time filtering**: Today's slots exclude past times + 15 min buffer
5. **State reset on focus**: Screens reset state in `useFocusEffect` to avoid stale data
6. **No localStorage**: Mobile app uses `expo-secure-store` for token persistence

---

*Last Updated: February 2026*
*Version: 1.0*
