# SIH Safety Platform (Monorepo)

This monorepo follows the instructions in `.github/instructions/AIinstructions.instructions.md`.

- Apps: Next.js web, Express API gateway, (placeholders for mobile, ML, IoT)
- Packages: shared types, UI tokens, schemas
- Infra: docker-compose stack for local dev

Quick start (once Node 20+ and pnpm are installed):

## Quick Start

Install deps and build web/API:
```bash
pnpm install
pnpm -C apps/web build
pnpm -C apps/api-gateway build
```

Run API and Web from the repo root (dev mode):
```bash
# Start API (serves demo data if DB isn't up yet)
pnpm run api:start
# Health check
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:4000/healthz

# Start Web in dev mode (use PORT env)
PORT=3037 pnpm run web:dev
# Health check
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3037/healthz

# Open the dashboard
# http://localhost:3037/dashboard/incidents
```

Smokes:
```bash
./scripts/smoke-ml.sh     # ML /healthz
./scripts/smoke-api.sh    # API /healthz + incidents list
```

See `/docs/runbooks.md` and `/docs/architecture.md` for details.

## Makefile shortcuts (optional)

```bash
# API database prep (build + migrate + seed)
make api-db

# Run quick API smoke
make api-smoke

# Start ML locally (reload) and check health
make ml
make ml-health

# Start web in dev mode
make web
```

start server
```
cd apps/api-gateway && npm start
```
on a new terminal
```
cd apps/web && npm run dev
```