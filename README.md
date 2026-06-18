# ZeroBurn Farmer Mobile Web App

Mobile-first farmer web app prototype rebuilt from the Figma `Prototype / ZeroBurn Farmer Mobile UX v3` design.

[Open the live app](https://matchagtea.github.io/ZeroBurn/)

The app focuses on the real farmer workflow:

`ลงทะเบียน -> โฉนด -> ขอบเขตแปลง -> ปลูก -> เก็บเกี่ยว -> หลักฐานไม่เผา -> ตรวจ -> ได้แต้ม -> ลงขาย`

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Node.js + Express + TypeScript
- Database: Postgres + Prisma
- Runtime modes: in-memory repository by default, Postgres with `REPOSITORY_MODE=postgres`
- External integrations: deterministic mock adapters until real API contracts are available

## Commands

```bash
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
```

For local Postgres with Docker:

```bash
docker compose up -d postgres
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
```

If Docker is unavailable, Prisma can start a lightweight local database:

```bash
npm run db:local:start
npx prisma dev ls
```

Copy the displayed TCP URL into `DATABASE_URL` in `.env`, set
`REPOSITORY_MODE=postgres`, then run:

```bash
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Stop the lightweight database with `npm run db:local:stop`.

## GitHub Pages

GitHub Pages serves the static build from the `gh-pages` branch. Build it in
LocalStorage prototype mode with:

```bash
VITE_API_BASE='' npm run build
```

GitHub Actions is currently unavailable for this account, so the generated
`dist` directory is published to `gh-pages` manually.

## Handoff

See [docs/WEB_APP_BUILD_PLAN.md](docs/WEB_APP_BUILD_PLAN.md) for current progress, architecture, routes, API plan, database plan, and continuation notes.
