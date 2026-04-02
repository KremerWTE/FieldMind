# Session Notes — 2026-04-02 (Session 2)
## PropTrax Integration + CI Pipeline + Production Deployment Prep

---

## Summary

Completed the full PropTrax integration (read API + outbound webhooks), rebuilt the missing CI workflow, added auto-migration for production containers, fixed several bugs, and closed all remaining feature gaps. FieldMind is now feature-complete.

---

## Work Completed

### 1. Remaining Feature Gaps (from previous context)

| Item | File | Notes |
|---|---|---|
| Web reset-password page | `apps/web/app/auth/reset-password/page.tsx` | Reads `?token=`, validates, calls POST /auth/reset-password, auto-redirects to /login |
| EAS build config | `apps/mobile/eas.json` | development/preview/production profiles with env URL per profile |

### 2. CI/CD Pipeline

**File:** `.github/workflows/ci.yml`

Three jobs:
- `api` — builds .NET 10, runs 23 tests with real TimescaleDB service container
- `web` — `npm ci` + `npm run build -w @fieldmind/web` (NEXT_IGNORE_INCORRECT_LOCKFILE=1)
- `docker` — builds API Docker image on push (gated on api job passing)

Runs on push to `main` and `kremer-dev`, and on PRs to `main`.

### 3. Production Infrastructure

| Change | File | Detail |
|---|---|---|
| Auto-migration | `apps/api/Program.cs` | Added `db.Database.MigrateAsync()` before seeding — containers apply migrations on startup |
| Healthcheck fix | `docker-compose.full.yml` | `curl -f` → `wget --spider` (ASP.NET runtime has wget, not curl) |
| AI env var fix | `docker-compose.full.yml` | `OpenAI__ApiKey` → `AI__OpenAI__ApiKey` (wrong nesting) + `AI__Provider` added |
| EAS env blocks | `apps/mobile/eas.json` | preview + production → `https://api.fieldmind.io`; development → localhost |
| Mobile env docs | `apps/mobile/.env.example` | Added LAN IP + production URL guidance |

### 4. PropTrax Integration (Full Implementation)

**Purpose:** Allow PropTrax (property management website) to consume FieldMind AI analysis data and receive real-time event notifications.

#### API Endpoints (`X-Api-Key` header auth)

| Endpoint | Returns |
|---|---|
| `GET /proptrax/ping` | Auth check + linked building count |
| `GET /proptrax/buildings` | All buildings with PropTraxBuildingId set |
| `GET /proptrax/buildings/:proptraxId` | Building detail + current health scores |
| `GET /proptrax/buildings/:proptraxId/analysis` | AI-analyzed photos with descriptions, tags, detected issues, presigned S3 URLs |
| `GET /proptrax/buildings/:proptraxId/issues` | Maintenance events (filterable by status) |

#### Outbound Webhooks

`PropTraxWebhookService` fires POST to the team's `PropTraxWebhookUrl` on:
- `photo.analyzed` — after every AI analysis (includes full annotation + maintenance event if created)
- `maintenance.created` — when AI auto-creates a maintenance event

Webhooks are best-effort (non-blocking, never fail the main job). Include `X-FieldMind-Key` header for PropTrax to verify origin.

#### Team Config Endpoints (Admin only, JWT auth)

| Endpoint | Purpose |
|---|---|
| `GET /team/proptrax-config` | Get current config (API key preview + webhook URL) |
| `PUT /team/proptrax-config` | Set webhook URL |
| `POST /team/proptrax-config/regenerate-key` | Generate new `ptx_` prefixed API key (shown once) |

#### Files Created/Modified

| File | Change |
|---|---|
| `apps/api/Controllers/PropTraxController.cs` | New — 5 read-only endpoints |
| `apps/api/Services/PropTraxWebhookService.cs` | New — webhook delivery service |
| `apps/api/Models/Team.cs` | Added PropTraxApiKey + PropTraxWebhookUrl |
| `apps/api/Migrations/20260402200000_AddPropTraxIntegration.cs` | New migration |
| `apps/api/Jobs/PhotoAIAnalysisJob.cs` | Wire webhook after analysis |
| `apps/api/Controllers/TeamController.cs` | 3 new PropTrax config endpoints |
| `apps/api/Program.cs` | Register PropTraxWebhookService + HttpClient |
| `apps/web/app/(dashboard)/admin/settings/page.tsx` | PropTrax Integration card |
| `apps/web/app/(dashboard)/buildings/[id]/page.tsx` | PropTraxBuildingId editor in overview tab |

#### Bug Fixed

`PropTraxWebhookService.SendPhotoAnalyzedAsync` had a broken LINQ subquery for team lookup:
```csharp
// WRONG — invalid subquery
var team = await context.Teams.FirstOrDefaultAsync(t => t.Id == photo.Building.Team.Id
    || context.Buildings.Any(b => ...));

// FIXED — simple Include
var building = await context.Buildings.Include(b => b.Team).FirstOrDefaultAsync(b => b.Id == photo.BuildingId);
var team = building?.Team;
```

---

## PropTrax Go-Live Steps

1. Team Settings → PropTrax Integration → click "Generate key" → copy `ptx_...` key
2. Optionally set webhook URL (PropTrax endpoint to receive events)
3. For each building: Building detail → Overview tab → enter PropTrax building ID → Save
4. Give PropTrax: API key + base URL (`https://api.fieldmind.io`)
5. PropTrax calls `GET /proptrax/ping` to verify — returns `{ status: "ok", team: "...", linked_buildings: N }`

---

## Answered Question: PropTrax + AI Photo Analysis

User asked whether photos run through AI to provide details for PropTrax. Answer: **Yes, fully built.**

- Every uploaded photo → `PhotoAIAnalysisJob` (Hangfire) → OpenAI GPT-4o Vision
- Returns: short description, full description, tags, categories, detected issues (type/severity/confidence), repair priority, structural impact score
- PropTrax gets this via `/proptrax/buildings/:id/analysis` (polling) OR the `photo.analyzed` webhook (real-time push)
- PropTrax API key set in Team Settings; buildings linked via PropTraxBuildingId on each building

---

## API Shape Reference (PropTrax endpoints)

```
GET /proptrax/buildings/:proptraxId/analysis?limit=50&offset=0
→ {
    total: number,
    offset: number,
    limit: number,
    photos: [{
      photo_id, captured_at, geo_lat, geo_lng, image_url,
      ai: {
        short_description, full_description,
        tags[], categories[],
        severity_score, confidence_score,
        repair_priority, structural_impact_score,
        model, analyzed_at,
        detected_issues: [{ type, description, severity, confidence }]
      }
    }]
  }

POST <webhook_url>  (fired by FieldMind)
  Header: X-FieldMind-Key: <proptrax_api_key>
  Body: {
    event: "photo.analyzed",
    proptrax_building_id: "...",
    photo_id: "...",
    captured_at, geo_lat, geo_lng,
    ai: { ... },
    maintenance_event: { id, title, severity, status } | null
  }
```

---

## Commits This Session

```
feat: add eas.json for production mobile builds and reset-password web page
feat: production deployment — CI workflow, auto-migration, Docker healthcheck fix
feat: PropTrax integration — read API + outbound webhooks
fix: PropTrax webhook team query bug + building PropTrax ID editor + prod env config
```

---

## Current State

**Feature-complete.** All code written. Only production cloud setup remains.

## Next Session Priorities

1. **Install Docker Desktop** → `docker compose up -d` → `dotnet run` → verify end-to-end locally
2. **Production deployment** (see `docs/DEPLOYMENT.md`):
   - Azure App Service + PostgreSQL
   - AWS S3 bucket
   - SendGrid API key
   - OpenAI API key
   - `npx vercel --prod` for web
3. **EAS mobile**: `eas init` → replace `YOUR_EXPO_PROJECT_ID` in `app.json` → `eas build --profile production`
4. **PropTrax go-live**: generate key in Team Settings, link buildings, share credentials
