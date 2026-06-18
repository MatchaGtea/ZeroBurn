# ZeroBurn Farmer Mobile Web App Build Plan

## Progress

- Status: In Progress
- Last updated: 2026-06-18 02:14 +07
- Current owner: Codex (handoff-ready checkpoint)
- Next task: Add automated API tests, then run Postgres migration/seed against local Docker

## Current Checkpoint

Step 3 is complete: the old desktop dashboard frontend has been replaced with a mobile-first ZeroBurn Farmer web app that follows the Figma UX V3 flow. The app has 6 bottom tabs, full-screen destination routes, Thai farmer-friendly wording, real farm photos, contextual mascot poses, workflow-driven Next Action, and local mock submit state that advances the workflow. Tooling is stable again after reinstalling dependencies and updating Prisma 7 config.

Important tooling note: `antigravity-ide chat --mode agent` was attempted twice from CLI, but it opened/queued chat in the IDE without applying file changes or returning agent output. Codex implemented the Step 3 frontend directly and reviewed it.

## Product Goal

Build the farmer-facing ZeroBurn mobile web app from the Figma `Prototype / ZeroBurn Farmer Mobile UX v3`. The app should feel like a phone app first, not a desktop dashboard. The primary workflow is:

`ลงทะเบียน -> ถ่ายรูปโฉนด -> ยืนยันขอบเขตแปลง -> บันทึกวันปลูก -> บันทึกเก็บเกี่ยว -> ส่งหลักฐานไม่เผา -> ตรวจ Zero-Burn -> ได้แต้ม -> ลงขาย -> ขายสำเร็จ`

## Architecture

- Frontend: React + Vite + TypeScript. Keep this because the repo already uses it and it is fast for mobile web prototypes.
- Backend: Node.js + Express + TypeScript. Use controllers/services/repositories/adapters so external APIs can be swapped in later.
- Database: Postgres + Prisma. Use relational tables for farmers, plots, records, verification, token, listings, uploads, and workflow events.
- Prototype mode: API uses an in-memory repository by default so the app works without a running DB. Prisma schema and Docker Postgres are included for migration work.

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
- [x] Browser QA against Figma at 390x844 and 430x932

### Backend

- [x] Replace single mock server with Express TypeScript API
- [x] Add `/api/v1` routes
- [x] Add validation and in-memory repository
- [x] Add external adapter interfaces/mocks
- [ ] Add automated API tests

### Database

- [x] Add Prisma schema
- [x] Add Docker Postgres config
- [x] Add seed script
- [ ] Run migration against local Postgres

### API Integrations

- [x] Mock adapter interfaces created
- [ ] Connect real land deed/boundary API
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
- [ ] Add automated API tests

## Progress Log

- 2026-06-18: Added Step 2 handoff/architecture baseline. Created `docs/WEB_APP_BUILD_PLAN.md`, replaced README overview, added `.env.example`, Docker Postgres config, Prisma schema/seed, TypeScript Express API skeleton, in-memory repository, mock external adapters, and shared frontend data contracts.
- 2026-06-18: Paused by user request before frontend rebuild. Next implementer should start by replacing the old dashboard UI with the Figma mobile app shell and routes.
- 2026-06-18: Attempted Antigravity CLI twice with `antigravity-ide chat --mode agent --reuse-window`; no file changes or terminal output were produced. Proceeded with direct implementation.
- 2026-06-18: Completed mobile-first frontend rebuild in `src/App.tsx`, `src/components/ui.tsx`, and `src/index.css`. Copied selected photo/mascot assets into `public/zeroburn-assets` for reliable static deployment.
- 2026-06-18: Verified `npm run typecheck` and `npm run build`. Production preview QA passed at 390x844, 430x932, and 900x920 centered desktop layout. Tested Next Action -> evidence form -> result -> sell and Next Action -> sell form routes in browser.
- 2026-06-18: Re-ran `npm ci` after disk cleanup, fixed the remaining ESLint issue in `server/index.ts`, added Prisma 7 `prisma.config.ts` dotenv loading, and verified `npm run lint`, `npm run typecheck`, `npm run build`, `npx prisma validate`, and API smoke checks.
- 2026-06-18: Verified `npm run dev` starts both Vite at `/ZeroBurn/` and the Express API at `/api/v1`; stopped the dev session after smoke checks.

## Open Issues

- Real auth provider is not selected yet.
- Real file storage provider is not selected yet.
- Real external API contracts are not available yet.
- Postgres migration should be run after Docker is available locally.
- API tests should be added for validation errors, missing IDs, and mock adapter failure paths.
