applyTo: '**'

#if something is complex, don't do it as the first hackathon is near and we need a working prototype as fast as possible {for example a feature that is complex to implement, just build it for the show, not the actual feature}

version: '0.3.0'
lastUpdated: '2025-09-19'
owners:
  - platform-team
reviewCadence: 'bi-weekly'
changeLogFile: '/docs/CHANGELOG.md'
adrDir: '/docs/adrs'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes. Keep this pragmatic and aligned to this repo’s current stack and ports.


# SIH Safety Platform — AIinstructions (Expanded, Implementation-Ready)

This is a step-by-step, implementation-ready execution plan for building the SIH safety system:
- Web portal + Mobile app (tourists and authorities)
- AI/ML models for risky behavior detection
- Blockchain-based ID with verifiable credentials
- Police dashboards with real-time maps and data streams
- IoT wearables integration for extreme-risk areas
- Automated alerts & evidence logging with chain-of-custody
- Dark mode design system across web and mobile
- Database design and data contracts aligned to frontend UX and backend services

Follow this file as your “source of truth” doc for repos, architecture, endpoints, data models, and deployment.

Repo quick facts (local dev)
- Web (Next.js dev): http://localhost:3037
- API Gateway (Express): http://localhost:4000
- ML Serving (FastAPI): http://localhost:8000
- If a page is “not reachable,” first verify the correct web port (3037) and free ports with `make ports-kill` before restarting.

---

## 0) Tech Stack (Recommended + Rationale)

- Frontend (Web):
  - Next.js 14+ (App Router, SSR/ISR), TypeScript, Tailwind CSS (class strategy) or Chakra UI, Next Themes (dark mode), Mapbox GL JS, Socket.IO Client, React Query/TanStack Query, Zod for client validation
- Mobile:
  - React Native (Expo), TypeScript, React Navigation, Zustand or Redux Toolkit, Expo SecureStore/Keychain (token storage), React Query, RN Map (Mapbox or Google), Notifee/Expo Notifications
- Backend:
  - Node.js 20+, NestJS (controllers + providers) or Express + Zod, TypeScript
  - API style: REST for ingest and mobile; GraphQL for dashboard flexibility (optional hybrid)
  - WebSockets: Socket.IO
  - Internal RPC: gRPC (optional)
- Datastores:
  - PostgreSQL 15+ (core), PostGIS (geo), TimescaleDB (telemetry time-series), Redis (caching, sessions, queues), S3-compatible (MinIO/AWS S3) for media
- Streaming/Messaging:
  - Kafka (core events) or NATS (lighter), MQTT (IoT ingest via Mosquitto/EMQX)
  - Schema registry (Confluent or Redpanda) if Kafka
- AI/ML:
  - Python 3.10+, PyTorch, Ultralytics YOLOv8, ONNX/TensorRT, OpenCV
  - FastAPI for inference, MLflow for experiments, DVC for datasets
- Identity + Blockchain:
  - OIDC (Keycloak preferred, self-hostable) + JWT + RBAC
  - DID/VC: Polygon ID or Hyperledger Aries/Indy
  - Optional IPFS for VC/evidence metadata (hash-only)
- DevOps:
  - Docker, Docker Compose (dev), Kubernetes (staging/prod), Helm, Terraform (cloud IaC)
  - GitHub Actions CI/CD, OpenTelemetry, Prometheus, Grafana, Loki, Vault/SOPS
- Security:
  - mTLS between services, Rate limiting (e.g., 100 req/min/user), Input validation everywhere
  - Secrets: Vault or KMS; token rotation

---

## 1) Repository Structure (Monorepo with Turborepo)

```
/sih-safety-platform
  /apps
    /web               # Next.js App Router
    /mobile            # React Native (Expo)
    /api-gateway       # NestJS/Express REST + GraphQL + Socket.IO
    /auth-svc          # OIDC + DID/VC issuance/verification
    /alert-svc         # Rules engine + push/SMS/email
    /risk-svc          # Risk scoring + geofencing
    /media-svc         # Evidence ingest + S3 + hashing + anchoring
    /iot-gateway       # MQTT bridge + normalization + Kafka producer
    /ml-serving        # FastAPI inference server
  /packages
    /ui                # Shared UI components, theme tokens
    /shared            # DTOs, types, utils, constants
    /proto             # gRPC/Protobuf (if used)
    /schemas           # OpenAPI/GraphQL schemas, JSON Schemas, Avro
  /ml
    /datasets          # DVC tracked datasets
    /training          # Training scripts
    /notebooks         # EDA & prototyping
    /pipelines         # CI/ML pipelines
    /model-registry    # MLflow registry
  /infra
    /compose           # docker-compose.*.yml
    /k8s               # Helm charts/manifests
    /terraform         # IaC per environment
    /observability     # OTel, Prom, Grafana, Loki configs
    /github-actions    # CI workflows
  /docs
    architecture.md
    api-specs.md       # generated from OpenAPI/GraphQL
    data-models.md     # ERD, table specs
    security.md        # threat model, policies
    runbooks.md        # on-call, incident response
```

Conventions:
- Packages publish types and JSON Schemas used by both frontend and backend.
- Codegen: OpenAPI/GraphQL -> clients in /packages/shared for strict typing.

### 1.1) Monorepo tooling & governance (Turborepo + Changesets)

- Package manager: PNPM workspaces; root scripts drive all apps via Turborepo.
- Turborepo pipeline (turbo.json):
  - pipeline tasks: lint -> typecheck -> test -> build -> docker
  - cache inputs: src/**, package.json, tsconfig*, .env.example; outputs: dist/**
  - remote cache optional (Vercel Remote Cache or Redis)
- Versioning & releases: Changesets with Conventional Commits; publish prereleases from feature branches if needed.
- Code ownership: CODEOWNERS per app/package; PR templates enforce checklist (schema/codegen/docs updated).
- Enforced formatting & quality: Prettier + ESLint + TypeScript strict + stylelint (web/mobile styles) + commit hooks via Lefthook/Husky.
- Security gates: secret scanning, SCA/SAST (Trivy/Semgrep) on PRs.
- Design tokens single-source-of-truth in /packages/ui exported to web/mobile.

---

## 2) System Architecture Overview (Data, Real-time, Identity)

- Ingest paths:
  - Mobile/Web -> API Gateway -> Services -> Postgres/Redis/S3
  - Wearables -> MQTT -> IoT Gateway -> Kafka -> Services
  - Media -> Media Service -> S3 -> Metadata + Hash -> Blockchain anchor batch job
  - AI -> ML Serving -> risk events -> Kafka -> Risk/Alert Services
- Real-time:
  - Socket.IO from API Gateway to dashboards for incidents/alerts/telemetry overlays
  - Kafka for reliable inter-service events
- Identity:
  - OIDC login (PKCE); JWTs for APIs; RBAC enforced via Casl/Policy Guards
  - DID/VC for authority-only actions (verify VC proof)

---

## 3) Milestones & Deliverables (Sprints)

- Sprint 1: Platform scaffolding
  - Monorepo, CI, Compose stack, base DB schemas, Auth (OIDC), Next.js boot, Expo boot
- Sprint 2: MVP incidents & map
  - Incident reporting/upload, listing/filtering, Map with bbox query, Socket live updates
- Sprint 3: Alerts + IoT prototype
  - MQTT ingest, Timescale telemetry, rules engine, push notifications
- Sprint 4: ML baseline + Evidence CoC
  - YOLOv8 fine-tune, FastAPI infer, evidence hashing + append-only CoC, dashboard evidence viewer
- Sprint 5: DID/VC + hardening + dark mode polish
  - VC issuance/verification, observability, load/security tests, UX/DX polish, dark mode
- Sprint 6: Production readiness
  - Backups, disaster recovery, autoscaling, SLOs, playbooks

---

## 4) Backend — Step-by-Step Execution (Deep Dive)

4.1 Project Bootstrap
- Create NestJS app in apps/api-gateway, apps/auth-svc, apps/alert-svc, apps/risk-svc, apps/media-svc
- Create FastAPI app in apps/ml-serving
- Create Node worker in apps/iot-gateway
- Shared packages: pnpm workspaces linking, tsconfig base
- GitHub Actions:
  - lint/test on PR
  - Docker build for all apps; push to registry on main
  - Preview environments optional for web

4.2 Configuration & Secrets
- 12-factor env vars with typed config schemas (Zod) per service
- .env.development, .env.test, .env.production templates
- Use Vault or SOPS for production secrets
- Key env:
  - DATABASE_URL, REDIS_URL, S3_ENDPOINT/KEY/SECRET/BUCKET
  - KAFKA_BROKERS, MQTT_URL, MAPBOX_TOKEN (frontend), OIDC_*
  - TOKEN_SIGNING_KEYS (rotate), ML_SERVICE_URL

4.3 Database Design (PostgreSQL + PostGIS + Timescale)
- ERD (key tables):
  - users(id, email, phone, oidc_sub, did, role, status, created_at)
  - devices(id, owner_user_id, type, provisioned_key, status, created_at)
  - device_bindings(id, device_id, user_id, start_at, end_at)
  - incidents(id, type, severity, status, geom geography(Point,4326), reporter_user_id, created_at, updated_at, assigned_to_user_id)
  - incident_notes(id, incident_id, author_user_id, body, created_at)
  - evidence(id, incident_id, media_uri, sha256, mime_type, size_bytes, chain_ref, created_at, created_by)
  - alerts(id, incident_id, rule_id, channel, recipient, status, sent_at, retries)
  - geofences(id, name, level, polygon geography(Polygon,4326), active, created_at)
  - risk_scores(id, entity_type, entity_id, score, details_json, ts)
  - telemetry (Timescale hypertable): (device_id, ts timestamptz, lat, lon, hr int, accel_x, accel_y, accel_z, sos boolean, battery numeric, geom geography(Point,4326))
  - chain_of_custody(id, evidence_id, action, actor, signature, created_at)
  - push_tokens(id, user_id, platform, token, created_at, revoked_at)
- Indices:
  - incidents: GIST on geom, btree(status, severity, created_at desc)
  - telemetry: time partition by ts (Timescale), index on (device_id, ts desc), GIST on geom
  - geofences: GIST on polygon
  - evidence: btree(incident_id, created_at desc), unique sha256
- Views/Materialized Views for Frontend:
  - incident_list_view: incident + latest_note + assigned officer name for fast dashboards
  - incident_heatmap_mv (materialized): grid density for analytics map
- Partitioning & Retention:
  - telemetry retention policy (e.g., 90 days hot, archive cold)
  - incidents retained per policy; evidence immutable
- Migrations:
  - Use Prisma or TypeORM. Example Timescale hypertable:
    ```sql
    SELECT create_hypertable('telemetry','ts');
    ```

4.4 Data Access Layer (Repositories)
- Use CQRS pattern or repository pattern per service
- Return DTOs aligned to frontend filters (pagination, sort, bbox)
- Cache common reads in Redis with versioned keys:
  - key patterns: incidents:list:{hash_of_query}, risk:score:{entity_type}:{id}

4.5 API Contracts (REST + optional GraphQL)
- REST conventions:
  - JSON, kebab-case endpoints, snake_case DB columns, camelCase JSON
  - Pagination: cursor or offset; include total only for small sets or with cached counts
  - Errors: RFC 7807 style { type, title, status, detail, code } with codes (e.g., INC_404_NOT_FOUND)
- GraphQL:
  - Schema located in /packages/schemas/graphql
  - Use codegen to generate TS types and hooks

4.6 AuthZ/AuthN
- OIDC with PKCE, short-lived access tokens (15m), refresh rotation (sliding)
- Roles: tourist, authority, operator, admin
- Policy matrix:
  - tourist: create/view own incidents/evidence, receive alerts
  - authority: view all incidents in jurisdiction, triage, request evidence, receive alerts
  - operator/admin: manage geofences, rules, users
- DID/VC:
  - Authority actions require VC proof (role credential) included in request header (e.g., Proof-JWT)
  - Backend verifies VC via issuer public keys / blockchain resolver

4.7 Incidents API (Examples)
- POST /incidents
  - body: { type, severity, description, location: { lat, lon }, media?: [signedUploadRequest] }
  - returns: { id, status, created_at }
- GET /incidents
  - query: status[], severity[], bbox=[minLon,minLat,maxLon,maxLat], from,to, q, cursor, limit
- PATCH /incidents/:id
  - body: { status, assigned_to_user_id? }
- GET /incidents/:id/evidence
- POST /incidents/:id/notes

PostGIS bbox filtering:
```sql
SELECT * FROM incidents
WHERE status = ANY($1)
AND ST_Intersects(
  geom,
  ST_MakeEnvelope($minLon,$minLat,$maxLon,$maxLat,4326)
)
ORDER BY created_at DESC
LIMIT $limit OFFSET $offset;
```

4.8 Evidence & Media
- Flow:
  1) Frontend requests signed URL: POST /evidence/signed-upload -> { url, fields, key }
  2) Client uploads directly to S3
  3) Client confirms upload: POST /incidents/:id/evidence { key, mime, size }
  4) media-svc fetches object, computes sha256, stores record, appends CoC: "uploaded"
  5) Batch job anchors Merkle root hash on-chain hourly -> updates evidence.chain_ref
- Chain-of-custody append-only log:
  - actions: uploaded, viewed, transferred, verified, anchored
  - each action signed by service key; store signature + ts

4.9 Alerts Service
- Rules definition (JSONLogic or custom):
  - fields: id, name, active, conditions, channels[], cooldown_sec
- Triggers:
  - manual SOS
  - ML risk > threshold
  - telemetry anomaly + inside high-risk geofence
- Channels:
  - Push (FCM/APNs), Email, SMS, WebSocket
- Delivery tracking:
  - store status (sent, delivered, failed), retries with exponential backoff
- APIs:
  - GET /alerts?status=sent&since=...
  - GET/POST /rules
  - POST /alerts/test

4.10 IoT Gateway + MQTT
- Topics:
  - iot/{deviceId}/telemetry
  - iot/{deviceId}/event (sos, fall)
- Payload schema (JSON Schema in /packages/schemas/json):
  ```json
  {
    "deviceId": "uuid",
    "ts": "iso8601",
    "lat": 19.076,
    "lon": 72.8777,
    "hr": 108,
    "accel": [0.01, 1.02, -0.03],
    "sos": false,
    "battery": 0.56,
    "sig": "base64(signature)"
  }
  ```
- Validation with Ajv/Zod; signature verified using device public key
- Kafka topics:
  - telemetry.ingest.v1 (Avro/JSON Schema), events.sos.v1, events.fall.v1
- Backpressure:
  - Use Kafka partitions by device_id; retry DLQ topic on validation failure

4.11 Risk Service
- Inputs: telemetry.ingest, ML risk events, geofence updates
- Logic:
  - Compute rolling risk: baseline + ML score + geofence multiplier
  - create incident if risk > threshold or SOS true
- Stored outputs: risk_scores history, incident link if created
- API:
  - GET /risk/score?entity=user:{id}|area:{geohash}

4.12 WebSockets (Socket.IO)
- Namespaces:
  - /dashboard, /user
- Rooms:
  - jurisdiction:{cityId}, user:{userId}, incident:{id}
- Events:
  - incidents.stream: {id, type, severity, status, coords, ts}
  - alerts.stream: {id, incidentId, channel, status, ts}
  - telemetry.stream (throttled): {deviceId, coords, hr, sos, ts}
- Auth:
  - JWT in connection params; join rooms based on role/jurisdiction

4.13 Observability
- OpenTelemetry SDK in all services
- Traces propagated across HTTP/WebSocket/Kafka
- Metrics:
  - API latency/throughput, inference latency, alert delivery rate, queue lag
- Logs:
  - Structured JSON, Loki stack, PII scrubbing

4.14 Security
- Rate limits per route (e.g., POST /incidents: 10/min/user)
- Input validation, output escaping
- CSRF for web cookie flows if using cookies; prefer Authorization header (Bearer)
- mTLS in cluster; allowlist egress
- Backups:
  - Postgres daily full + WAL; S3 versioning; restore runbook

4.15 Testing
- Unit tests (Jest, PyTest)
- Integration tests with Testcontainers (Postgres/Redis/S3/Kafka/MQTT)
- Contract tests (Pact) for API Gateway <-> Services
- Load tests (k6/Locust) for incidents/alerts and WebSockets

4.16 Performance Targets
- API p95 < 300ms (non-ML)
- Infer p95 < 500ms cloud; <150ms edge
- Dashboard map query: bbox 1x1km with 5k incidents -> <200ms via indices/materialized view

4.17 Reliability & consistency patterns
- Idempotency keys for POST endpoints that create resources (e.g., POST /incidents) via Idempotency-Key header stored in Redis for 24h.
- Outbox pattern for event publishing to Kafka (transactional write to outbox table + async dispatcher); Inbox/processed table for dedupe on consumers.
- Retry with exponential backoff and jitter when calling external services (S3, ML, SMS/Email) with circuit breaker at service boundary.
- Correlation IDs: propagate x-correlation-id across HTTP, WS, Kafka; include in logs and traces.
- Graceful shutdown & health probes: /healthz (liveness) /readyz (readiness) per service; drain WS and stop consuming Kafka before exit.

4.18 API stability & evolution
- OpenAPI-first for REST; schema versioning (v1, v2) with deprecation headers and end-of-life dates.
- GraphQL schema: use @deprecated with removal dates; keep resolver backward compatibility for one minor version.
- Pagination contract: cursor-based by default; stable ordering; maximum page size enforced (e.g., 200).
- Partial responses and sparse fieldsets where relevant to reduce payload size.

4.19 Security hardening (backend specifics)
- Validate and normalize all inputs with Zod/DTO classes; enforce content-length limits and multipart size caps.
- Enforce strict CSP/secure headers at API Gateway/Ingress (Helmet/NGINX annotations); enable rate limiting and IP allowlists for admin routes.
- Keys & secrets rotation: short-lived AWS/S3 creds via STS; JWT signing keys rotation with JWKS endpoint.
- Data encryption at rest for sensitive columns (e.g., phone) using libsodium/pgcrypto with key in KMS/Vault; envelope encryption for evidence metadata when required.

4.20 Data migrations & seeding
- Migrations via Prisma/TypeORM with zero-downtime strategy (expand/migrate/contract pattern); pre-deploy checks and post-deploy cleanup.
- Deterministic seed data for dev/staging with faker locale; anonymized production snapshots for testing with PII masked.
- ERD and migration docs auto-generated into /docs/data-models.md in CI on schema changes.

---

## 5) Frontend (Web) — Step-by-Step Execution

5.1 Project Setup
- Next.js App Router, TypeScript strict
- Tailwind CSS with class strategy OR Chakra UI; Next Themes for dark mode
- React Query for data fetching/caching; Axios or Fetch with interceptors
- Env: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_WS_URL, NEXT_PUBLIC_MAPBOX_TOKEN
  - In this repo, NEXT_PUBLIC_API_URL can be omitted; web falls back to http://localhost:4000 and shows API status in header.

5.2 Folder Structure
```
apps/web
  /app
    /(public)          # marketing or public pages
    /dashboard         # protected routes (authorities)
    /tourist           # protected routes (tourists)
    /api               # Next APIs if needed (avoid for core)
    layout.tsx
    page.tsx
  /components
  /features            # feature modules (incidents, map, alerts)
  /hooks
  /lib                 # api client, auth utils, theme
  /styles
```

5.3 Theming & Dark Mode
- Next Themes:
  - <ThemeProvider attribute="class" defaultTheme="system" enableSystem />
- Tailwind config:
  - darkMode: 'class'; define CSS variables for colors in :root and .dark
- Persist preference:
  - save user preference in localStorage and to backend profile (PUT /users/me/preferences)
- Contrast & accessibility:
  - Ensure WCAG AA color contrast; test both themes with Storybook a11y

5.3.1 Vibrant UI & Link Integrity (this repo)
- Use existing CSS tokens in `apps/web/app/layout.tsx` to keep a vivid but accessible palette (primary #2563eb, success #10b981, danger #ef4444).
- Ensure header links return 200: `/`, `/dashboard/incidents`, `/tourist/report`, `/tourist/id-demo`.
- Keep `/report` -> `/tourist/report` redirect.
- Buttons: 6px radius, solid primary for main actions, neutral outline for secondary; visible focus states.
- Report page: “Use my location” must update the mini map and auto-fill lat/lon; provide manual lat/lon inputs with clamping.
- Add small, non-blocking enhancements only; avoid risky UI rewrites before demos.

5.3.2 Multi-palette theme system (repo-adapted)
- Scope: Only touch `apps/web` (Next.js App Router). Do not modify backend services or API contracts. Prefer additive CSS and small components over refactors.
- Core CSS variables: Define semantic tokens at a single source (RootLayout or a global CSS). In this repo, keep the existing inline CSS in `apps/web/app/layout.tsx` and extend it with variables:
  - At minimum: `--color-bg`, `--color-surface`, `--color-primary`, `--color-accent`, `--color-secondary`, `--color-on-primary`, `--color-on-surface`, `--color-muted`, `--color-border`, `--shadow-small`, `--shadow-medium`, `--transition-fast`, `--transition-medium`, `--radius-md`.
- Theme classes: Provide 4 palettes as CSS classes on `<html>`: `.theme-teal` (default), `.theme-sunset`, `.theme-indigo`, `.theme-mint`. Each overrides the same variables. Keep `.dark` support as-is; theme classes should work in both modes where possible.
- Utilities (additive): Introduce lightweight utility classes consumed by existing pages without renaming current classes/ids. Keep them in a small global CSS injected from `layout.tsx` or a new `apps/web/app/globals.css` if desired.
  - Buttons: `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`
  - Helpers: `.text-muted`, `.card`, `.chip`, `.badge`, `.icon`
  - Micro interactions: focus-visible outline; subtle hover elevation; respect `prefers-reduced-motion`.
- Theme switcher (client-only): Add a tiny utility (e.g., `apps/web/components/ThemePaletteToggle.tsx`) that applies CSS variable maps at runtime and persists choice in `localStorage` under `site-theme`. Keep separate from the existing dark mode toggle.
  - `applyTheme(name)` updates CSS variables on `document.documentElement` or toggles `.theme-xxx` classes; restore selection from `localStorage` on mount.
  - Provide a small menu (footer or header) to switch between the 4 palettes; keep UI unobtrusive.
- Safe replacements: When encountering hardcoded colors in JSX inline styles within `apps/web`, prefer replacing with variables via classNames. Avoid renaming any element IDs or data-* attributes.
- Icons: Ensure icons use `currentColor` or `.icon { color: var(--color-muted) }` so palette changes flow through.

Palettes (reference values)
- Teal Breeze (`.theme-teal`, default)
  - `--color-primary: #0ea5a4; --color-accent: #06b6d4; --color-secondary: #ffb020; --color-bg: #F8FBFC; --color-surface: #FFFFFF; --color-on-primary: #ffffff; --color-muted: #6b7280; --color-border: rgba(2,8,23,0.06); --color-success: #16a34a; --color-error: #ef4444;`
- Sunset Coral (`.theme-sunset`)
  - `--color-primary: #ff6b6b; --color-accent: #ff9f43; --color-secondary: #7c3aed; --color-bg: #fff9f8; --color-surface: #ffffff; --color-on-primary: #ffffff; --color-muted: #6b7280; --color-border: rgba(15,23,42,0.06);`
- Vivid Indigo (`.theme-indigo`)
  - `--color-primary: #5b21b6; --color-accent: #06b6d4; --color-secondary: #7c3aed; --color-bg: #f7f7ff; --color-surface: #ffffff; --color-on-primary: #ffffff; --color-muted: #4b5563;`
- Mint Lime (`.theme-mint`)
  - `--color-primary: #16a34a; --color-accent: #34d399; --color-secondary: #0891b2; --color-bg: #f6fffa; --color-surface: #ffffff; --color-on-primary: #ffffff; --color-muted: #374151;`
- Optional shades if needed: define `--color-primary-600` and `--color-primary-400` as fixed hexes or computed via `color-mix` for hover/focus variants.

Component mapping (how to apply)
- Buttons: use `var(--color-primary)` and `var(--color-on-primary)`. On hover, optional linear-gradient with `--color-accent`.
- Nav/Sidebar: background `var(--color-surface)`, active accents with `--color-primary`, subtle hover tint via `color-mix` to avoid heavy backgrounds.
- Cards: `var(--color-surface)` + `var(--color-border)` + `var(--shadow-small)`; hover elevates to `var(--shadow-medium)`.
- Forms: focus ring from `--color-primary` with soft spread; error `--color-error`; success `--color-success`.
- Tables: header subtle tint; row hover slightly darker surface; borders from `--color-border`.
- Chips/Badges: use `color-mix(in srgb, var(--color-primary) 12%, var(--color-surface))` for soft chips.

Accessibility & performance
- Maintain minimum contrast (4.5:1 text, 3:1 large text). If a palette variant fails, darken `--color-primary` or adjust `--color-on-primary`.
- Respect `prefers-reduced-motion`; disable transitions where set.
- Keep transitions short (≤240ms). Avoid expensive shadows on large lists.

QA & acceptance (UI themes)
- Acceptance:
  - Theme switcher toggles across 4 palettes and persists after reload.
  - Buttons and cards render consistently across pages (home, dashboard/incidents, tourist/report, tourist/id-demo).
  - No broken IDs or data-* attributes; navigation and forms unaffected.
- QA checklist:
  - Keyboard navigation: focus-visible outlines present.
  - Visual contrast checks on key pages.
  - Test widths: 360, 375, 768, 1024, 1440.
  - Verify SVG icons honor `currentColor`.
  - Smoke links: `/`, `/healthz`, `/dashboard/incidents`, `/tourist/report`, `/tourist/id-demo`, `/report` (redirect).

5.4 Auth & Route Protection
- OIDC redirect flow; receive tokens in callback page
- Store access token in memory and refresh in Secure Cookies (httpOnly) or local storage with strict XSS hygiene
- HOCs/Server Components:
  - server-side auth check for SSR pages
- Role-based guards for /dashboard vs /tourist routes

5.5 Core UI
- Map page:
  - Mapbox GL, cluster layer for incidents, filters (severity, time range, status)
  - Fetch with bbox (debounced), keep cursor pagination for lists
- Incident reporting wizard:
  - Stepper: details -> location -> media upload -> review
  - Direct upload to S3 via signed URL
- My Reports:
  - Paginated list; status chips; evidence list with thumbnails
- Dashboard:
  - Live stream panel (WebSocket), incident triage drawer (assign, status)
  - Evidence viewer with signed URL, download audit
- Analytics:
  - Heatmap layer (materialized view), time-series charts (Prom/Timeseries API)

5.6 State & Data
- React Query keys:
  - ['incidents', queryHash], ['incident', id], ['alerts', params], ['geofences'], ['me']
- Cache times set per route; background refetch on focus
- Optimistic updates for assignment/status changes

5.7 Error & Loading UX
- Skeleton loaders for map/list
- Global error boundary with support contact
- Toasts for actions (success/error)

5.8 Testing & Perf
- Unit: RTL + Vitest/Jest
- E2E: Playwright (auth flows, map filters, report submission)
- Lighthouse audits (PWA optional)
- Code splitting, dynamic imports; image optimization

5.9 UI system, forms, and accessibility polish
- Component primitives: Radix UI + Tailwind (or Chakra alternative) with tokens from /packages/ui; consider shadcn-style composition for consistency.
- Form handling: react-hook-form + zod resolver; accessible inline validation and summary list for errors.
- Motion & micro-interactions: reduce-motion respects OS setting; meaningful focus states; skeletons shimmer accessible.
- Map UX: debounce bbox queries; show loading tiles state; offline-friendly hints on mobile viewport sizes.
- Theming: ensure token-driven spacing/typography; document component examples in Storybook with dark/light variants and a11y tests.

---

## 6) Mobile (React Native) — Step-by-Step Execution

6.1 Setup
- Expo (managed), TypeScript, EAS builds
- State: Zustand or Redux Toolkit; React Query
- Secure storage: Expo SecureStore
- Deep links for alerts -> incident detail

6.2 Theming & Dark Mode
- Use React Native Paper or custom theme with Design Tokens from /packages/ui
- Follow system theme by default; theme toggle in settings
- Persist choice in SecureStore; sync to backend preferences

6.3 Screens
- Auth/Login (OIDC WebBrowser + PKCE)
- Home:
  - Nearby risk indicator (geofence + incidents), quick SOS
  - Live advisories list
- Report:
  - Camera (expo-camera) or gallery; compress media; location picker
  - Upload via signed URL; retry queue offline
- My Reports:
  - List + status; open incident detail
- Devices:
  - BLE pairing (react-native-ble-plx), device status, test SOS
- Notifications:
  - Push inbox; tap -> navigate to incident

6.4 Offline-first
- Queue unsent reports with files; resume on connectivity
- Cache GET endpoints in SQLite/AsyncStorage with TTL
- Local-only SOS fallback: send SMS to emergency number with last known coords (opt-in)

6.5 Background Tasks
- Background fetch for geofence advisories
- BLE telemetry bridging to MQTT/HTTPS when allowed
- Handle push received in background to show critical alerts

6.6 Push Notifications
- Register device token; POST /users/me/push-tokens
- Topics by jurisdiction; critical alerts with high-priority channel

6.7 Testing
- Device testing on low-end Android
- Detox/E2E for critical flows
- Crash reporting (Sentry/Expo)

6.8 Privacy, permissions, and battery
- Just-in-time permission prompts with clear rationale; fallbacks for denied permissions.
- Background tasks respect battery saver; adaptive telemetry frequency; opt-in offline maps (if used) with cached tiles.
- PII minimization on device; secure logs; scrub PII before crash reports.

---

## 7) AI/ML — Step-by-Step

7.1 Use-cases
- Vision: weapon/violence detection from uploaded images/video frames (opt-in CCTV)
- Telemetry: fall detection, SOS press, anomalous motion/vitals

7.2 Data & Experiments
- DVC tracked datasets; augmentations
- Label Studio/CVAT for annotations; export YOLO format
- MLflow:
  - track runs, params, metrics (precision/recall), confusion matrices
- Bias review & model card

7.3 Baseline Models
- YOLOv8 (n/s sizes) finetuned on target classes
- Telemetry anomaly: LSTM/Transformer autoencoder; simple threshold rules fallback

7.4 Export & Serving
- Convert to ONNX; optimize with TensorRT where available
- FastAPI endpoints:
  - POST /infer/image: {image_base64|s3_key}
  - POST /infer/video-stream: multipart chunks or RTSP gateway (optional)
  - POST /infer/telemetry: sliding window vector
- Emit risk events to Kafka with score, label, bbox metadata

7.5 Monitoring
- Track drift, latency, error rates
- Human-in-the-loop feedback: authority marks incident valid/invalid -> feed back to dataset

---

## 8) Blockchain-based ID — Step-by-Step

8.1 Selection
- Start with Polygon ID for zk-friendly credentials; fallback to Hyperledger Aries if preferred

8.2 Flows
- Issuance:
  - POST /auth/did/issue { role: 'authority' } -> VC QR / link; store did on user
- Verification:
  - For privileged endpoints, client submits proof in header; server verifies proof and role claim
- Evidence Anchoring:
  - Every hour, batch evidence sha256 into Merkle tree; anchor root on-chain; store tx id in evidence.chain_ref

8.3 Privacy
- Do not store PII on-chain
- VC revocation lists supported
- Consent logs for data sharing

8.4 Operationalizing DID/VC
- Store issuer/verification keys in Vault; rotate regularly; maintain JWKS endpoints and cache with TTL.
- Test vectors for VC proofs included in CI; negative tests for invalid/expired credentials.

---

## 9) IoT Wearables — Step-by-Step

9.1 Device Scope
- Accelerometer, HR, GPS (optional), SOS button
- Connectivity: BLE -> Mobile gateway or direct LTE/NB-IoT

9.2 Provisioning
- Unique device keypair; register via POST /iot/register-device -> returns device_id and broker creds
- Rotate creds periodically

9.3 Payloads & Topics
- MQTT topics iot/{deviceId}/telemetry and iot/{deviceId}/event
- Sign payloads with device private key; verify at gateway

9.4 Edge Logic
- Simple threshold and fall detection on-device to reduce bandwidth
- Telemetry rate: e.g., 1 Hz normal, 5 Hz on event for 15s

9.5 Security
- MQTT over TLS
- Pin broker cert on device firmware where possible

---

## 10) Alerts & Evidence Logging — Step-by-Step

10.1 Rules
- JSONLogic example:
  ```json
  {
    "and": [
      { ">": [ { "var": "hr" }, 150 ] },
      { "==": [ { "var": "sos" }, true ] },
      { "inGeoFenceLevel": ["HIGH"] }
    ]
  }
  ```
- Thresholds configurable per jurisdiction

10.2 Delivery
- Push high priority with sound/vibration
- SMS fallback for critical alerts
- WS emit to dashboard rooms

10.3 Evidence Logging
- Append-only CoC on every view/download by authority (privacy-aware)
- Signed URL access logged with actor id and purpose

---

## 11) DevOps, CI/CD, Environments

11.1 Environments
- dev: docker-compose (postgres+postgis+timescale, redis, minio, kafka, mosquitto, keycloak)
- staging: k8s single node, public endpoints behind auth
- prod: managed k8s, multi-AZ, RDS/Aurora Postgres, MSK/Redpanda, S3

11.2 CI/CD
- Lint+Test gates; build images; SBOM and image scanning
- Helm deploy with values per env
- Database migrations automated with zero-downtime strategy

11.3 Observability & SLOs
- Tracing, metrics, logs dashboards
- SLO examples:
  - 99.9% alert pipeline availability
  - p95 incident create < 300ms

11.4 Security
- Dependency scanning (Dependabot + SCA)
- Secret scanning
- IAM least privilege
- Regular DR drills (restore DB & S3)

11.5 Release & branching strategy
- Branching: trunk-based with short-lived feature branches or GitFlow (feature/release/hotfix) depending on team size; document chosen model in /docs/runbooks.md.
- Conventional Commits + Changesets to bump versions of packages; release tags per app (e.g., web@1.2.0, api-gateway@0.8.1).
- Release trains: weekly for web/mobile; on-demand for backend services with canary to 10% traffic before full rollout.
- Feature flags: Unleash/Flagd for progressive delivery; kill switches for risky features.

11.6 GitOps & deployment
- ArgoCD or Flux for cluster state; Helm charts per app in /infra/k8s; promotion via PR to env folders.
- Horizontal autoscaling: KEDA based on Kafka lag/CPU; WS pods scaled on connection count.
- Service mesh (Linkerd/Istio) optional for mTLS and retry/breaker policies.

---

## 12) Data Contracts & DTO Schemas (Frontend ↔ Backend Alignment)

12.1 OpenAPI (REST) Example
```yaml
paths:
  /incidents:
    get:
      parameters:
      - in: query
        name: bbox
        schema: { type: string, example: "minLon,minLat,maxLon,maxLat" }
      - in: query
        name: status
        schema: { type: array, items: { type: string, enum: [open, triaged, closed] } }
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/IncidentListResponse"
components:
  schemas:
    IncidentListResponse:
      type: object
      properties:
        items:
          type: array
          items: { $ref: "#/components/schemas/Incident" }
        nextCursor: { type: string, nullable: true }
    Incident:
      type: object
      properties:
        id: { type: string, format: uuid }
        type: { type: string }
        severity: { type: string, enum: [low, medium, high, critical] }
        status: { type: string, enum: [open, triaged, closed] }
        coords: { type: array, items: { type: number }, minItems: 2, maxItems: 2 }
        createdAt: { type: string, format: date-time }
```

12.2 JSON Schema (IoT Telemetry)
- Located in /packages/schemas/json/telemetry.v1.json (versioned)

12.3 GraphQL (Dashboard)
```graphql
type Query {
  incidents(filter: IncidentFilter, cursor: String, limit: Int): IncidentConnection!
  incident(id: ID!): Incident
}
```

12.4 Client Codegen
- Use openapi-typescript or graphql-code-generator to emit TS types/hooks into /packages/shared

12.5 Contract sync & CI enforcement
- CI job regenerates OpenAPI/GraphQL/JSON Schemas and fails if git diff is non-empty (ensures clients and /docs/api-specs.md are in sync).
- Schema Registry (Kafka) checks compatibility (backward/forward) on PRs affecting Avro/JSON Schemas.
- Pact/contract tests run as part of gateway <-> services pipeline; breaking changes block merge unless versioned.

12.6 Idempotency & deduplication contracts
- For POST endpoints, require support for Idempotency-Key and echo idempotency result; document response headers.
- Event payloads include eventId, occurredAt, schemaVersion; consumers must dedupe by eventId.

---

## 13) Database Playbook (for Frontend + Backend Needs)

13.1 Mapping UI needs to DB:
- Map list (bbox + filters): requires GIST index on incidents.geom, composite filters on status/severity/created_at
- “My Reports”: index incidents by reporter_user_id, created_at
- Dashboard analytics: precompute materialized heatmap per time bucket

13.2 Example Materialized View
```sql
CREATE MATERIALIZED VIEW incident_heatmap_mv AS
SELECT
  date_trunc('hour', created_at) as bucket,
  ST_SnapToGrid(geom::geometry, 0.01, 0.01) as cell,
  count(*) as cnt
FROM incidents
GROUP BY bucket, cell;

CREATE INDEX ON incident_heatmap_mv (bucket);
CREATE INDEX ON incident_heatmap_mv USING GIST (cell);
```

13.3 Telemetry Hypertable & Retention
```sql
SELECT create_hypertable('telemetry','ts');
SELECT add_retention_policy('telemetry', INTERVAL '90 days');
```

13.4 PostGIS Helpers for API
- Nearest incidents:
```sql
SELECT id, type, severity, status, created_at,
       ST_X(geom::geometry) lon, ST_Y(geom::geometry) lat
FROM incidents
ORDER BY geom <-> ST_SetSRID(ST_MakePoint($lon,$lat), 4326)
LIMIT 50;
```

13.5 Transactions & Concurrency
- Use SERIALIZABLE or REPEATABLE READ for critical updates (assignment)
- Optimistic locking via updated_at checks in PATCH operations

13.6 Backups & Restore
- Nightly full + continuous WAL archiving
- pg_dump for schema-only backups before migrations

---

## 14) UX, Design System & Accessibility

- Design tokens shared in /packages/ui (colors, spacing, radii)
- Dark mode:
  - Tokens map to CSS variables; .dark overrides
  - Persist preference; sync to server
- Components:
  - Buttons, Inputs, Cards, Modals, Tabs, Pills, MapLegend, StatusBadge
- Accessibility:
  - Keyboard nav, ARIA labels, focus states
  - Color contrast AA; test in both themes
- Internationalization (optional):
  - i18n routing; message catalogs

---

## 15) Security & Privacy

- Threat Model:
  - MITM -> TLS everywhere, cert pinning on mobile (optional)
  - Token theft -> short TTL, refresh rotation, revoke on logout
  - Data exfiltration -> field-level encryption for PII, access logs
  - Malicious media -> virus scan on upload (clamav) before public access
- PII:
  - Data minimization; retention policies
  - Right to delete where applicable (not for evidence with legal hold)
- Audit:
  - Immutable CoC; admin actions audited

---

## 16) Acceptance Criteria (Expanded)

Functional
- Incident creation with media visible on dashboard within 2s (p95)
 - Header nav links all navigate and return 200 (home, dashboard incidents, report, ID demo)
- Wearable SOS triggers authority push within 3s (p95)
- Evidence integrity verifiable: sha256 match and on-chain anchor reference present within 2h

Non-Functional
- API p95 latency < 300ms
 - Web dev server reachable at http://localhost:3037; /healthz returns 200
 - WebSocket reconnect < 3s with missed events replay (since last seq)
- Mobile offline: queued report submits automatically within 30s of reconnect

Security/Privacy
- All privileged actions require appropriate role and, where required, VC proof
- Logs redact PII; evidence access creates audit entries

Load
- 10k concurrent clients; 1k devices; Kafka no message loss under burst (backpressure OK)

---

## 17) Quick Local Bring-Up (Developer)

Prereqs
- Node 20+, PNPM, Python 3.10+, Docker Desktop, Make

Steps
1) git clone <repo> && cd sih-safety-platform
2) cp infra/compose/.env.example infra/compose/.env; fill secrets
3) docker compose -f infra/compose/docker-compose.yml up -d postgres redis minio kafka zookeeper mosquitto keycloak
4) pnpm install
5) pnpm -C apps/api-gateway dev
6) pnpm -C apps/web dev
7) pnpm -C apps/ml-serving dev
8) Open http://localhost:3037 (web), http://localhost:4000 (api), http://localhost:8000 (ml)

Smoke tests
- Web: /healthz returns 200; header links work
- API: /healthz returns {status:"ok", demo: <bool>}
- Create incident via web; see it on dashboard list/map (or demo entries)

Tips
- Use Turbo to run all dev servers in parallel:
  - pnpm turbo run dev --parallel --filter=api-gateway --filter=web --filter=ml-serving
- Makefile optional: `make dev`, `make stop`, `make seed`. Document in /docs/runbooks.md.
- If schemas change, run `pnpm -w codegen` to regenerate clients and docs.

Troubleshooting (dev)
- If the site is “not reachable,” first free ports and restart clean:
  - make ports-kill
  - make up-reset WEB_PORT=3037
- Health probes:
  - make api-health (expects 200)
  - make web-health (expects 200)
- Start minimal background servers if you don’t need health checks:
  - make up
- Clear stale Next.js cache if UI behaves oddly:
  - make web-reset

---

## 18) Appendices

A) Example .env (api-gateway)
```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sih?sslmode=disable
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=minio123
S3_BUCKET=evidence
OIDC_ISSUER=http://localhost:8080/realms/sih
OIDC_CLIENT_ID=web
OIDC_CLIENT_SECRET=changeme
JWT_PUBLIC_KEY=...
JWT_PRIVATE_KEY=...
KAFKA_BROKERS=localhost:9092
MQTT_URL=mqtts://localhost:8883
ML_SERVICE_URL=http://localhost:8000
```

B) API Error Codes
- INC_404_NOT_FOUND
- INC_403_FORBIDDEN
- EVD_409_DUPLICATE_HASH
- AUTH_401_INVALID_TOKEN
- VC_400_INVALID_PROOF

C) Redis Keys
- incidents:list:{qHash} -> JSON, ttl 30s
- user:pref:{userId} -> theme, locale
- push:tickets:{id} -> delivery state

D) Kafka Topics (v1)
- telemetry.ingest.v1 (partition by deviceId)
- events.sos.v1
- risk.inferred.v1
- alerts.sent.v1

E) Dark Mode Implementation Checklist
- Web:
  - Install next-themes; add ThemeProvider in root layout
  - Tailwind dark classes; add ToggleThemeButton component
  - Persist to localStorage and PUT /users/me/preferences { theme }
- Mobile:
  - Use Appearance API; store override in SecureStore
  - Provide ThemeContext; style all components accordingly
  - Sync to server preference

F) Conventional Commits (summary)
- feat: user-facing features; fix: bug fixes; perf: performance; refactor: no behavior change; docs: docs; chore: tooling; ci: pipelines; build: deps/build.
- Scope recommended (e.g., web, api-gateway, risk-svc, schemas). Include BREAKING CHANGE footer when applicable.

G) Branching Model (example)
- default: main (protected). Feature branches: feat/<slug>. Release branches: release/<version>. Hotfix: hotfix/<slug>.
- Require PR reviews from CODEOWNERS; status checks (lint, test, typecheck, codegen-sync) must pass.

H) Sample CI workflows (high-level)
- pr.yml: setup PNPM cache -> turbo lint/type/test -> codegen -> verify docs/schemas -> build affected.
- release.yml: changesets version -> tag -> build images -> push registry -> publish packages.
- security.yml: semgrep, trivy, secret scanning; upload SARIF.

I) Agent operating rules (this repo)
- Keep changes low-risk and additive; prioritize working demo over complex features near hackathon.
- Use concise progress updates; after 3–5 file edits or tool actions, summarize deltas and what’s next.
- When planning multi-step work, maintain a lightweight todo list and keep exactly one item in-progress.
- Don’t block on missing details—assume 1–2 reasonable defaults aligned to this repo; call out assumptions.
- Validate with quick smoke checks (web and api /healthz) after changes that affect runtime.

---

This AIinstructions file is intentionally exhaustive to guide both implementation and review. Use /docs/api-specs.md and /docs/data-models.md for generated schemas and ERD, and keep them in lockstep with this document via CI checks.