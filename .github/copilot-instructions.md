## Copilot / AI agent instructions — SIH Safety Platform

This file gives concise, actionable guidance for AI coding agents working in this monorepo.

Overview
- Monorepo (pnpm + Turbo) containing multiple apps and packages:
  - apps/web — Next.js front-end (see `apps/web/README.md`)
  - apps/api-gateway — Express + TypeORM API (see `apps/api-gateway/README.md`)
  - apps/ml-serving — Python service (see `apps/ml-serving/README.md`)
  - packages/* — shared types, UI tokens, schemas (e.g. `packages/schemas`, `packages/shared`)
  - infra/compose/docker-compose.yml — local Postgres and dev stack

Key constraints & conventions
- Node >= 20 and pnpm are required (see `package.json` engines). The repo uses pnpm workspaces and Turbo.
- Use turbo for cross-package commands: `pnpm run build`, `pnpm run dev`, `pnpm run test` invoke turbo tasks.
- Targeted package commands: prefer `pnpm --filter @sih/<package> <script>` or `pnpm -C apps/<name> <script>` for single-package work
- Environment files: copy `.env.example` in each app (e.g. `apps/web/.env.example`, `apps/api-gateway/.env.example`). DB and migrations expect `DATABASE_URL`.
- DB: `apps/api-gateway` uses Postgres + TypeORM migrations. See `infra/compose/docker-compose.yml` for local Postgres setup and `pnpm -C apps/api-gateway migration:run` to apply migrations.

Developer workflows (examples)
- Install: `pnpm install` at repo root.
- Build everything: `pnpm run build` (runs `turbo run build`).
- Run dev for both API and Web concurrently: `pnpm run demo` or `pnpm run dev` (turbo parallel).
- Run API dev: `pnpm run api:start` or `pnpm -C apps/api-gateway dev`.
- Run Web dev: `pnpm run web:dev` or `pnpm -C apps/web dev`.
- Health checks: API and Web expose `/healthz`; quick smoke scripts live in `/scripts` (e.g. `./scripts/smoke-api.sh`, `./scripts/smoke-ml.sh`).

Patterns to follow (project-specific)
- Shared schemas and types: `packages/schemas` holds canonical JSON/GraphQL/OpenAPI artifacts — prefer generating types from these where present.
- Package names follow `@sih/<name>` convention used with `pnpm --filter`.
- Feature code tends to be split as apps (runtime) + packages (shared logic/types/ui). Avoid copying shared code into apps; instead update packages and run `pnpm -w build` / relevant turbo task.
- Observability: quick checks by calling `/healthz` endpoints; add tests that hit these endpoints for smoke tests when adding infra changes.

Files to consult (high value)
- `project/README.md` — local quick-start and make targets.
- `project/package.json` — scripts, workspace layout, and turbo usage.
- `apps/api-gateway/README.md` — DB, migrations, env setup.
- `apps/web/README.md` — Next.js-specific env and mapbox token usage.
- `infra/compose/docker-compose.yml` — how local Postgres and services are composed for dev.
- `packages/schemas/` and `packages/shared/` — canonical shared types and helpers.
- `docs/runbooks.md`, `docs/architecture.md` — higher-level runbooks and architecture notes (some are placeholders; verify content before assuming accuracy).

Working with tests / build / CI
- Tests and linting are run via `turbo` tasks: `pnpm run test`, `pnpm run lint`, `pnpm run typecheck`.
- When adding or refactoring shared types, update the package and run affected package builds via `pnpm -w build` or `turbo run build --filter=<target>` to keep cache predictable.

What to avoid / gotchas
- Don't assume `docs/architecture.md` is authoritative — it's marked as a placeholder; cross-check with code and READMEs.
- If you need to run DB migrations locally, ensure `DATABASE_URL` in `apps/api-gateway/.env` or root environment matches the docker-compose DB connection.
- Mapbox token is optional; absence should not be treated as an error for web features.

If you modify project structure or add packages
- Update `package.json` workspaces and run `pnpm install`.
- Keep `packages/*` public APIs stable; changes should include updating any dependent apps and their builds.

Questions / missing info to ask the maintainer
- Preferred CI provider and pipeline triggers (not present in repo files) — ask if CI steps need to be reflected in the instructions.
- Any additional runtime env secrets or vault info for staging/prod.

If you (AI agent) need to make changes
- Make minimal, well-scoped edits; run `pnpm install` and the relevant `pnpm -C <app> build` locally to ensure no TypeScript or build errors. Prefer small PRs with clear descriptions.

---
If anything here is unclear or you want me to expand examples (migrations, codegen, or package wiring), tell me which area to expand and I'll update this file.
