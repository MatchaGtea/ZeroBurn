# ZeroBurn Farmer Mobile Web App Build Plan

## Progress

- Status: In Progress
- Last updated: 2026-06-18 17:55 +07
- Current owner: Antigravity
- Next task: Step 6: Connect real verification/carbon/token APIs and marketplace buyer platform integrations.

## Current Checkpoint

Step 5 is complete. Supabase Auth, private file storage (Supabase Storage buckets), and asynchronous HTTP land deed adapter integration (with retry logic and idempotency key preservation) have been implemented, connected across frontend and backend, and validated.

## Product Goal

Build the farmer-facing ZeroBurn mobile web app from the Figma `Prototype / ZeroBurn Farmer Mobile UX v3`. The app should feel like a phone app first, not a desktop dashboard. The primary workflow is:

`ลงทะเบียน -> ถ่ายรูปโฉนด -> ยืนยันขอบเขตแปลง -> บันทึกวันปลูก -> บันทึกเก็บเกี่ยว -> ส่งหลักฐานไม่เผา -> ตรวจ Zero-Burn -> ได้แต้ม -> ลงขาย -> ขายสำเร็จ`

## Architecture

- Frontend: React + Vite + TypeScript. Keep this because the repo already uses it and it is fast for mobile web prototypes.
- Backend: Node.js + Express + TypeScript. Use controllers/services/repositories/adapters so external APIs can be swapped in later.
- Database: Postgres + Prisma. Use relational tables for farmers, plots, records, verification, token, listings, uploads, and workflow events.
- Runtime modes: API uses an in-memory repository by default and switches to Prisma/Postgres with `REPOSITORY_MODE=postgres`.
- Static Pages mode: LocalStorage provides the same prototype workflow when no hosted API is reachable.

## Frontend Plan

- Replace the old desktop dashboard with a mobile-first app shell.
- Routes:
  - `/` dashboard / next action
  - `/plots` plot management
  - `/plots/new` add and confirm plot
  - `/records` planting and harvest hub
  - `/records/planting/new` planting form
  - `/records/harvest/new` harvest form
  - `/records/success` record success
  - `/status` Zero-Burn status
  - `/status/evidence` evidence submission
  - `/status/result` verification result
  - `/sell` token and marketplace
  - `/sell/new` attach token and create listing
  - `/sell/status` listing approval/sold state
  - `/profile` farmer profile
  - `/profile/edit` registration/profile completion
- Use Thai wording, large touch targets, bottom nav, rounded white cards, pale green backgrounds, real farm photos, and contextual mascot poses.

## Backend Plan

- Prefix APIs with `/api/v1`.
- Keep auth mocked as a single farmer while preserving request boundaries for future auth middleware.
- Use zod validation for prototype form submissions.
- Add external API adapters:
  - land deed OCR/boundary
  - map/GIS
  - burn verification
  - carbon/token assessment
  - marketplace buyer platform
- v1 adapters return deterministic mock responses from `.env` controlled mode.

## Database Schema

Prisma models cover:

- FarmerProfile
- Plot
- LandDocument
- PlantingRecord
- HarvestRecord
- EvidenceSubmission
- Verification
- CarbonTokenLot
- MarketplaceListing
- UploadedFile
- WorkflowEvent

The app derives dashboard Next Action from workflow state and latest records, not from static text.

## External API Integration Notes

- Store external request IDs and response status on related records.
- Keep raw external payloads in JSON fields only for prototype/debug; define stricter DTOs before production.
- File upload stores metadata only in this prototype. Storage can later switch to S3/Supabase Storage without changing frontend form flow.

## Task Checklist

### Frontend

- [x] Replace Vite template README with project README
- [x] Rebuild app shell to mobile-first UX
- [x] Add contextual mascot/photo assets
- [x] Add workflow forms and mock submit states
- [x] Connect form submissions to API responses and refresh server state
- [x] Add submitting, double-submit prevention, success, and error feedback
- [x] Browser QA against Figma at 390x844 and 430x932

### Backend

- [x] Replace single mock server with Express TypeScript API
- [x] Add `/api/v1` routes
- [x] Add validation and in-memory repository
- [x] Add external adapter interfaces/mocks
- [x] Add Prisma/Postgres repository mode
- [x] Add automated API tests

### Database

- [x] Add Prisma schema
- [x] Add Docker Postgres config
- [x] Add seed script
- [x] Add initial migration with foreign-key/query indexes
- [x] Run migration and idempotent seed against local Postgres

### API Integrations

- [x] Mock adapter interfaces created
- [x] Connect real land deed/boundary API
- [ ] Connect real verification/carbon/token APIs
- [ ] Connect real marketplace API

### QA

- [x] `npm run typecheck`
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npx prisma validate`
- [x] `npm run dev` smoke check
- [x] API smoke test core workflow endpoints
- [x] Mobile viewport visual QA
- [x] Automated API tests: 10 passing
- [x] Postgres full-workflow smoke test: plot -> planting -> harvest -> evidence -> token -> listing -> sold
- [x] Browser interaction QA for listing and plot-confirmation flows
- [x] GitHub Pages static build and `gh-pages` deployment path

## Progress Log

- 2026-06-18: Added Step 2 handoff/architecture baseline. Created `docs/WEB_APP_BUILD_PLAN.md`, replaced README overview, added `.env.example`, Docker Postgres config, Prisma schema/seed, TypeScript Express API skeleton, in-memory repository, mock external adapters, and shared frontend data contracts.
- 2026-06-18: Paused by user request before frontend rebuild. Next implementer should start by replacing the old dashboard UI with the Figma mobile app shell and routes.
- 2026-06-18: Attempted Antigravity CLI twice with `antigravity-ide chat --mode agent --reuse-window`; no file changes or terminal output were produced. Proceeded with direct implementation.
- 2026-06-18: Completed mobile-first frontend rebuild in `src/App.tsx`, `src/components/ui.tsx`, and `src/index.css`. Copied selected photo/mascot assets into `public/zeroburn-assets` for reliable static deployment.
- 2026-06-18: Verified `npm run typecheck` and `npm run build`. Production preview QA passed at 390x844, 430x932, and 900x920 centered desktop layout. Tested Next Action -> evidence form -> result -> sell and Next Action -> sell form routes in browser.
- 2026-06-18: Re-ran `npm ci` after disk cleanup, fixed the remaining ESLint issue in `server/index.ts`, added Prisma 7 `prisma.config.ts` dotenv loading, and verified `npm run lint`, `npm run typecheck`, `npm run build`, `npx prisma validate`, and API smoke checks.
- 2026-06-18: Verified `npm run dev` starts both Vite at `/ZeroBurn/` and the Express API at `/api/v1`; stopped the dev session after smoke checks.
- 2026-06-18: Added Node test-runner API coverage, strict server TypeScript config, Express app dependency injection, and validation/error-path tests.
- 2026-06-18: Added indexed Prisma migration, Decimal marketplace pricing, Prisma 7 PostgreSQL adapter, and idempotent Somchai Farm seed data. Applied the migration and ran the seed twice against a local Prisma Postgres server.
- 2026-06-18: Added a Prisma repository implementing all core endpoints, ownership/integrity validation, graceful shutdown, and memory/Postgres runtime selection.
- 2026-06-18: Connected frontend mutations to backend responses, added submit/error feedback, fixed plot boundary confirmation, and verified mobile sell and plot workflows in the in-app browser.
- 2026-06-18: Completed Step 5. Integrated file uploading via `uploadFileToStorage` into React forms (deed, planting, harvest, and evidence) and updated MemoryRepository/app endpoints to resolve and store file IDs properly.

## Step 6: Real Verification, Carbon Token & Marketplace Integrations (Future Steps)

### 1. Burn Verification API (Sentinel-2 / GISTDA Integration)
- Define `BurnVerificationAdapter` to swap out `mockBurnEvidence`.
- Submit the plot's coordinates (GeoJSON) and date range to the satellite hotspot checking service.
- Implement async polling or webhook callbacks to receive the satellite burn verification result.
- Store results, confidence scores, and raw payloads on the database `Verification` record.

### 2. Carbon Assessment & Token Minting API
- Implement a typed HTTP adapter connecting to the carbon evaluation provider.
- Submit the verified harvested area, yield tonnage, crop variety, and non-burn verification proof.
- Calculate carbon savings (kg CO2e) and resolve corresponding ZeroBurn token rewards dynamically.
- Interface with the ledger/token registry to mint and credit tokens to the farmer's wallet account.

### 3. Marketplace Buyer Platform Integration
- Update listing actions to publish the crop listings directly to a shared buyer-facing platform.
- Build a secure webhook endpoint `/api/v1/integrations/marketplace/callback` to handle purchase completion events.
- Implement atomic transactions to transfer token ownership and mark listings as `sold` automatically upon payment confirmation.

### 4. Production Environment Configuration
- Add credentials in `.env` for:
  - `SATELLITE_VERIFICATION_API_URL` / `SATELLITE_API_KEY`
  - `CARBON_REGISTRY_MINT_URL` / `CARBON_REGISTRY_KEY`
  - `MARKETPLACE_PARTNER_SECRET` (for webhooks validation)

## Open Issues

- Real auth provider is not selected yet.
- Real file storage provider is not selected yet.
- Real external API contracts are not available yet.
- GitHub Pages currently uses LocalStorage fallback; a hosted API/database deployment target is not selected yet.
- GitHub Actions cannot start while the account has a billing lock, so Pages is deployed directly through the legacy `gh-pages` branch.
- Prisma CLI currently reports moderate advisories in its dev-only dependency chain; the available automated fix is an incompatible Prisma downgrade.
