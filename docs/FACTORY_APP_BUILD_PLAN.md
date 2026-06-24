# ZeroBurn Factory App Build Plan

## Goal

Build the factory-facing ZeroBurn workspace for sugar mill officers who review verified harvest lots, inspect zero-burn evidence, approve purchasing, and track intake operations. The farmer app is already complete, so this surface should reuse the same product language while shifting the UX from farmer guidance to factory operations.

## Scope

- Add a factory portal at `/factory`.
- Keep the current farmer workflow unchanged.
- Use local mock factory data first so GitHub Pages and local prototype mode still work without a factory backend.
- Model the factory UX around review queues, lot details, purchase approval, truck intake, scan lookup, and reporting.

## UX Plan

- Dashboard: today's queue, approved lots, risk lots, projected tonnage, and the next lot to review.
- Queue: searchable/filterable list of harvest lots with farmer, traceability ID, quantity, CCS, status, and risk.
- Review: detailed selected-lot panel with evidence thumbnails, token reference, carbon saved, and approval/request-info actions.
- Scan: simulated QR/traceability lookup for intake staff.
- Reports: compact operations summary for daily volume, approval rate, and risk distribution.
- Profile: factory account and buying rules.

## Implementation Plan

- Create `src/factory/types.ts` and `src/factory/mockData.ts` for factory-specific data contracts and seed data.
- Create `src/factory/FactoryApp.tsx` as a self-contained route surface.
- Add `/factory` routing in `src/App.tsx` before farmer auth gating.
- Add CSS classes in `src/index.css`, reusing existing variables, card geometry, touch targets, and mobile shell behavior.
- Add a login-screen link so testers can open the factory portal directly.

## Future Backend Plan

- Add factory auth and role-aware API boundaries.
- Add endpoints for factory lot search, verification review, purchase approval, intake scan, and purchase completion.
- Connect factory approvals to marketplace listing status and token ownership transfer once the external marketplace contract is available.

## QA Gates

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser smoke check at `/factory` in desktop and mobile widths.

## Progress Log

- 2026-06-23: Merged the `lnwmon` factory workspace into local `main`.
- 2026-06-25: Application review pass changed the demo direction from a direct factory portal link to a role-based landing/login flow. `/factory` now belongs behind a factory demo session, farmer/company registration enters the app directly without a 404 bootstrap path, and the factory surface behaves like a buyer marketplace instead of auto-selling lots.
- 2026-06-25: Expanded the factory marketplace mock flow with purchase requests, delivery/payment confirmation, token amount display, and a factory token wallet for completed orders.
