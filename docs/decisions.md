# DocAssist: decisions and context (from the planning chat, 13 Oct 2026)

Background for Claude Code. `CLAUDE.md` has the rules and commands; this file has the *why*.

## Product direction
- **Target: small clinics**, not hospitals. One doctor plus a receptionist is the main user. Ward, bed, department and executive-level features are out of scope.
- We reviewed open-source multi-agent hospital projects (AbhyDev/Multi-Agent-Hospital, HospitalSim, PulseCommand-AI, Swasps, openemr-agent, LangCare MCP FHIR). They are mostly demos or research. Useful as patterns, not as a base to build on.
- **No AI scribe / voice notes.** Indian doctors type and quick-pick prescriptions. Voice runs into OPD noise, mixed-language speech and consent issues. The prescription is effectively the visit note.

## Prescription suggestions: design principles
- **Most suggestions are not AI.** Typeahead needs under 100 ms, and an LLM takes seconds. Doctors trust their own patterns more than AI suggestions.
- Order of sources: the doctor's own history → clinic data / medicine database → AI only as a labelled fallback when there is no history.
- Always label the source in the UI ("Your usual, used 34 times" vs "AI suggestion"). This matters for trust and liability.
- **Safety check is rule-based** (allergies including drug classes, duplicate salts such as Dolo + Calpol, interactions from `medicines.drug_interactions`), and it also checks against medicines the patient is still taking. The LLM may explain warnings but never decides them.
- Every AI suggestion goes through the safety check before it is shown.
- **Learning loop:** record accepted, edited and rejected suggestions (`suggestion_events`). Per-doctor personalisation is the long-term edge over a generic AI call.
- Multi-agent architecture is **not** for the prescription screen. It belongs on the WhatsApp side (below).

## Known data gaps
- Only ~3% of the 2.5 lakh medicines have `salt_composition`, so many brands can't be safety-checked. The check reports these as "unverified" instead of passing them.
- Interaction data covers ~400 salts (about 900 checkable pairs). A better medicine and interaction dataset is needed before real patients rely on this.

## Roadmap (in order)
1. Deploy to the new GCP project (see DEPLOYMENT.md).
2. Mobile prescription screen: patient history panel, "your usual" regimen chips, safety warnings before save (block or confirm on critical/high), feedback events.
3. **WhatsApp receptionist agent:** booking, rescheduling, clinic hours and fees, handoff to staff. Reuse the TapNCollect architecture: direct Meta Cloud API, one webhook routing patient vs staff numbers, a state machine in the backend.
4. **Follow-up agent on WhatsApp:** reminders and day-3 check-ins, eventually replacing Fast2SMS.
5. Later: ABDM / ABHA integration (Indian health IDs), possibly following the MedScribeAlliance FHIR standard for interoperability.

Steps 3 and 4 are what clinic owners are likely to pay for first (fewer missed appointments, less receptionist work). Step 2 is what makes doctors like the app.

## Deployment choices
- New GCP project, Mumbai (`asia-south1`): Cloud Run + Cloud SQL Postgres 16 + Cloud Storage + Secret Manager, GitHub Actions with Workload Identity Federation (no JSON keys).
- The old environment (`mydocassist` project) no longer exists.

## What was verified vs not (as of the branch `deploy/fresh-gcp-and-rx-suggestions`)
- Verified in the sandbox: backend TypeScript build; migrations on a fresh Postgres 16 match `schema.prisma` exactly; medicine CSV loads (253,973 rows); all `/api/suggestions` endpoints against real data (search ~30 ms, usual dose, regimens, allergy/duplicate/interaction warnings in both directions and against current medicines); production refuses to start without `JWT_SECRET`; upload path-traversal guard; no new mobile TypeScript errors (~40 pre-existing ones remain).
- **Not yet verified:** the Docker image build, the GitHub Actions run, and anything on real GCP. Prisma's engine downloads and Docker were blocked in the sandbox. The first workflow run is the real test; fix from its logs.

## Security follow-up
- The old `notes.txt` (Cloud SQL password, DB IP, demo logins) is deleted on the branch but still in public git history. That database is gone, but never reuse the password. Scrub with `git filter-repo --path notes.txt --invert-paths` on a fresh clone, then force-push (rewrites history).
