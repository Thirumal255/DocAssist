# DocAssist: working notes for Claude Code

Clinic workflow app for Indian doctors: patients, appointments, visits/vitals, typed prescriptions with suggestions, billing, PDF prescriptions. Target users are small clinics (one doctor plus a receptionist), not hospitals.

Read `docs/decisions.md` at the start of a session: it has the product decisions, roadmap and what is verified vs not.

## Layout
- `backend/`: Node 20, Express, TypeScript, Prisma 5, PostgreSQL 16. Entry `src/index.ts`; all API routes under `/api`.
- `mobile/`: Expo SDK 51 / React Native, Expo Router, Zustand, TanStack Query. API base URL from `EXPO_PUBLIC_API_URL`.
- `deploy/setup-gcp.sh`: one-time GCP project setup. `.github/workflows/backend-deploy.yml`: CI/CD.
- `DEPLOYMENT.md` (production), `LOCAL_SETUP.md` (local dev).

## Commands (backend)
```
npm run dev                 # tsx watch on :3000
npm run typecheck           # must pass before any commit
npx prisma migrate dev --name <change>   # every schema change ships as a migration
npm run db:load-medicines   # import prisma/medicines.csv (~2.5 lakh rows)
npm run db:seed             # demo users, local only
```

## Rules
- **Schema changes = new migration folder.** Never `prisma db push` against shared DBs. CI fails if `prisma/migrations` doesn't reproduce `schema.prisma` exactly.
- Trigram GIN indexes are declared in the schema (`ops: raw("gin_trgm_ops")`); `pg_trgm` is created in migration `20261013120000_rx_suggestions`.
- Use the shared client `import { prisma } from '../lib/prisma'`. Never `new PrismaClient()`.
- Config and secrets come from `src/config.ts`. Production fails at startup if `JWT_SECRET` is missing; keep it that way.
- Files (logos, signatures) go through `src/lib/storage.ts`: Cloud Storage when `GCS_BUCKET` is set, `./uploads` locally. Never write to local disk in production code (Cloud Run disk is wiped).
- AI (OpenAI) is optional; everything must work without `OPENAI_API_KEY`. Never send patient name, phone, address or exact DOB to the AI (see `services/patient-context.ts`).
- Never commit credentials, `.env` files or notes with passwords. Secrets live only in Secret Manager.
- The mobile app has ~40 pre-existing TypeScript errors that Expo builds ignore; don't add new ones.

## Prescription suggestions (`/api/suggestions`, `services/rx-safety.ts`, `services/medicine-search.ts`)
The doctor types the prescription; the app suggests. Most suggestions come from the doctor's own history and the clinic's data, not AI.
- Medicine search: the doctor's most-used first, then prefix, then has-salt-data, then trigram similarity. De-duplicates repeated brand names.
- `medicine-defaults`: the doctor's usual dose/frequency/timing/days per medicine.
- `diagnoses` / `diagnosis`: autocomplete, and the doctor's usual regimens grouped by medicine set. AI fallback only when no history, always passed through the safety check.
- `patient-context/:id`: allergies, current (still-running) medicines, recent visits, vitals.
- `safety-check`: allergies (incl. drug classes), duplicate salts, interactions at salt level from `medicines.drug_interactions`, including against current medicines. Medicines without salt data are reported as unverified, never silently passed.
- `feedback`: `suggestion_events` table (accepted/edited/rejected) for the learning loop.
- Data limits: only ~3% of medicines have `salt_composition`; interaction data covers ~400 salts. A richer dataset is a known gap.

## Deployment (GCP, asia-south1)
Cloud Run `docassist-api`, Cloud SQL `docassist-db` (Postgres 16, db-f1-micro), bucket `<project>-docassist-uploads`, Secret Manager (`docassist-database-url`, `docassist-jwt-secret`, `docassist-admin-password`, optional `docassist-openai-api-key`), GitHub Actions via Workload Identity Federation.
- Push to `main` → check (typecheck + migration drift) → build image → `docassist-migrate` job → deploy → `/health/ready` smoke test.
- Workflow dispatch `task=bootstrap` (first time only): load medicines + create admin.
- Mobile: `eas env:create --name EXPO_PUBLIC_API_URL --value https://<run-url>/api --environment preview`, then `eas build -p android --profile preview`.

## Status and next tasks
- [ ] Project not deployed yet: run `deploy/setup-gcp.sh`, set GitHub variables, merge, bootstrap (see DEPLOYMENT.md).
- [ ] Scrub `notes.txt` from git history (it held the old DB password): `git filter-repo --path notes.txt --invert-paths` on a fresh clone, then force-push.
- [ ] Mobile UI: patient history panel and "your usual" regimen chips on `app/(app)/prescriptions/new.tsx`, using the `/suggestions` APIs.
- [ ] Mobile: show `safety-check` warnings before save (block-or-confirm on critical/high); send `feedback` events.
- [ ] Mobile: debounce the auto AI suggestion (currently fires 1 s after each diagnosis edit) and call `/suggestions/diagnosis` first.
- [ ] Later: WhatsApp receptionist and follow-up reminders (reuse the TapNCollect Meta Cloud API webhook pattern), ABDM/ABHA integration, a better medicine/interaction dataset.
