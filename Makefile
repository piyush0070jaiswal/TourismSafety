.PHONY: dev stop compose ml web web-build web-start api api-db iot api-smoke api-smoke-create api-test web-smoke web-dev api-start demo \
	ports-kill api-reset web-reset api-health web-health up-reset seed-demo up up-db

# Configurable web port (defaults to 3037). Override via `make WEB_PORT=3040 up-reset`.
WEB_PORT ?= 3037

dev:
	@echo "Starting dev servers with turbo (web, api, ml)"
	pnpm turbo run dev --parallel --filter=@sih/web --filter=@sih/api-gateway || npm run dev

stop:
	docker compose -f infra/compose/docker-compose.yml down

compose:
	docker compose -f infra/compose/docker-compose.yml up -d postgres redis minio kafka zookeeper mosquitto keycloak

ml:
	cd apps/ml-serving && python3 -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

ml-health:
	@curl -sS http://localhost:8000/healthz || true; echo

web:
	cd apps/web && pnpm dev || npm run dev

web-build:
	rm -rf apps/web/.next || true
	cd apps/web && pnpm build || npm run build

web-start:
	cd apps/web && pnpm start || npm start

api:
	cd apps/api-gateway && pnpm dev || npm run dev

api-db:
	cd apps/api-gateway && pnpm db:prepare

iot:
	cd apps/iot-gateway && pnpm dev || npm run dev

api-smoke:
	bash ./apps/api-gateway/scripts/smoke.sh

api-smoke-create:
	bash ./scripts/smoke-api-create.sh

api-smoke-patch:
	bash ./scripts/smoke-api-patch.sh

api-smoke-stats:
	bash ./scripts/smoke-api-stats.sh

api-test:
	node ./apps/api-gateway/scripts/test-api.mjs

web-smoke:
	./scripts/smoke-web.sh

web-dev:
	PORT=$(WEB_PORT) pnpm --filter @sih/web dev

api-start:
	pnpm --filter @sih/api-gateway dev


demo:
	@echo "Starting API and Web for demo (web on PORT=$${PORT-3037})"
	@echo "-> API"
	@pnpm --filter @sih/api-gateway dev &
	@sleep 3
	@echo "-> Web"
	@PORT=$(WEB_PORT) pnpm --filter @sih/web dev &
	@sleep 5
	@echo "-> Smokes"
	@./scripts/smoke-api.sh || true
	@PORT=$(WEB_PORT) ./scripts/smoke-web.sh || true

# Kill any processes listening on the common dev ports (4000: API, 3037: Web)

ports-kill:
	@pids=$$(lsof -nP -iTCP:4000 -sTCP:LISTEN -t 2>/dev/null || true); \
	if [ -n "$$pids" ]; then echo "Killing API port 4000: $$pids"; kill -9 $$pids; else echo "No process on 4000"; fi; \
	pids=$$(lsof -nP -iTCP:$(WEB_PORT) -sTCP:LISTEN -t 2>/dev/null || true); \
	if [ -n "$$pids" ]; then echo "Killing Web port $(WEB_PORT): $$pids"; kill -9 $$pids; else echo "No process on $(WEB_PORT)"; fi
	@# Fallback: kill stray Next.js devs from this repo if still conflicting
	@pgrep -fa "next dev" | grep -F "/apps/web" | awk '{print $$1}' | xargs -r kill -9 || true

# Reset API dev server: free port 4000, then start API (foreground)
api-reset: ports-kill
	@echo "Starting API on :4000"
	pnpm --filter @sih/api-gateway dev

# Reset Web dev server: free port 3037, clear .next cache, start (foreground)
web-reset: ports-kill
	@echo "Clearing Next.js cache"
	rm -rf apps/web/.next || true
	@echo "Starting Web on :$(WEB_PORT)"
	PORT=$(WEB_PORT) pnpm --filter @sih/web dev

# Health probes
api-health:
	@curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:4000/healthz

web-health:
	@curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:$(WEB_PORT)/healthz

# Reset both, then quick health checks
up-reset: ports-kill
	@echo "Starting API and Web (clean)" 
	@PORT=$(WEB_PORT) pnpm --filter @sih/web dev &
	@pnpm --filter @sih/api-gateway dev &
	@sleep 5
	@echo -n "API => "; curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:4000/healthz || true
	@echo -n "WEB => "; curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:$(WEB_PORT)/healthz || true

# Super-simple start (no port killing, no health probes). Starts Web and API in background using defaults.
up:
	@echo "Starting Web (:3037) and API (:4000)"
	@PORT=3037 pnpm --filter @sih/web dev &
	@pnpm --filter @sih/api-gateway dev &

# One-shot: start Postgres, run migrations+seed, then start API and Web (simple, no health probes)
up-db:
	@docker compose -f infra/compose/docker-compose.yml up -d postgres
	@pnpm --filter @sih/api-gateway db:prepare
	@$(MAKE) up

# Seed demo incidents via API (works only in demo mode when DB is uninitialized)
seed-demo:
	@echo "Seeding demo incidents (count=$${COUNT-10}) to http://localhost:4000/incidents/_bulk_demo" 
	@curl -sS -X POST http://localhost:4000/incidents/_bulk_demo -H 'Content-Type: application/json' -d '{"count":'"$${COUNT-10}"'}' | jq . || true
