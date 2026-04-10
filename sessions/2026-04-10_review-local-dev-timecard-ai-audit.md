# Session Notes — 2026-04-10
## Local Dev Run, Timecard Audit, AI Photo Pipeline Review

---

## Summary

Review and audit session. No new features built. Ran the app locally (confirmed SQLite works without Docker), audited the supervisor timecard against a physical paper timesheet, and traced the full AI photo analysis pipeline end-to-end.

---

## Work Done

### 1. Git Branch Sync Investigation

Discovered a case-sensitivity issue on GitHub:

| Branch | Tip | Status |
|---|---|---|
| `kremer-dev` (lowercase) | `e5aa8f1` | Full 36-commit branch — real dev branch |
| `Kremer-Dev` (capital) | `35b030f` | Stuck at "Initial commit" — stale/empty |

`kremer-dev` (lowercase) is fully synced with origin. The `Kremer-Dev` (capital) branch on GitHub is an artifact — it only has the initial commit and is essentially empty. This can cause confusion in the GitHub UI (showing as "X commits behind").

**Resolution:** Identified both branches. Left as-is pending user decision to delete `Kremer-Dev`.

---

### 2. Supervisor Timecard Audit

Compared the physical paper timesheet (photo: `timesheet.png`) against the web payroll pages.

**Physical timesheet layout:**
- Employee names as rows
- Days S/M/T/W/T/F/S as columns with simple daily hour totals
- REG hours + OT hours as separate columns
- Pay Rate column
- Gross Pay = Regular Salary + Other

**Current web app pages:**

| Page | What it has |
|---|---|
| `/admin/payroll` | Weekly grid (Mon–Sun), per-day hours, expandable clock in/out, OT badge per entry, approve/submit workflow |
| `/time-reports` | Summary totals, all-entries flat list, CSV export, date range filter |

**Gaps identified (not blocking production, but supervisor UX improvement):**
1. No hourly pay rate per employee
2. No REG vs OT column totals in the weekly grid
3. No gross pay calculation (rate × hours)
4. Week starts Monday in app; physical sheet starts Sunday

---

### 3. AI Photo Analysis Pipeline — Full Trace

Confirmed fully built end-to-end. Key findings:

**Flow:**
```
POST /photos/presign-upload
  → Photo created (AiStatus: Pending)
  → Frontend uploads directly to S3
POST /photos/complete-upload
  → Hangfire job queued
  → PhotoAIAnalysisJob runs:
      1. Mark Processing
      2. Generate presigned S3 GET URL (1hr expiry) for AI access
      3. Call AIService → MockVisionAnnotator (dev) or OpenAIVisionAnnotator (prod, GPT-4o)
      4. Save AiAnnotation (short/full description, tags, categories, detected issues, scores)
      5. Auto-create MaintenanceEvent if critical
      6. Send alert email if severity ≥ 75
      7. Update BuildingHealthStats
      8. Fire PropTrax webhook
      9. Mark Complete
```

**⚠ Production Risk Identified:**
Hangfire is configured with `UseInMemoryStorage()` in `Program.cs`. If the API restarts while jobs are queued or in-flight, all pending AI analysis jobs are lost — photos stay stuck at `Pending` or `Processing`. For production, switch to `Hangfire.PostgreSql` persistent storage.

---

### 4. Local Dev — Confirmed Running Without Docker

SQLite is configured in `appsettings.json` (`Data Source=fieldmind.db`). No Docker Desktop needed for local development.

**Running locally:**
- API: `cd apps/api && dotnet run --launch-profile http` → http://localhost:3001
- Web: `cd apps/web && npm run dev` → http://localhost:3000

Both confirmed healthy (`GET /health/live → Healthy`, web → 307 to /login).

---

### 5. Minor Code Change

`apps/web/app/(dashboard)/admin/payroll/page.tsx` — added `isOvertime?: boolean` to the `Entry` interface (was already rendered in the OT badge at line 537 but interface was missing the field).

---

## Key Findings Summary

| Finding | Impact |
|---|---|
| `Kremer-Dev` (capital) remote branch is empty | Low — cosmetic, causes confusing GitHub UI |
| Hangfire in-memory storage | **High** — jobs lost on API restart in production |
| Supervisor timecard missing rate/REG/OT/gross pay | Medium — UX gap for supervisors |
| Local dev works without Docker (SQLite) | Positive — faster local onboarding |

---

## Next Session Priorities

1. **Hangfire persistent storage** — switch to `Hangfire.PostgreSql` before production deploy
2. **Supervisor timecard enhancements** — add pay rate to User model, REG/OT column split, gross pay calc
3. **Production deployment** — see `docs/DEPLOYMENT.md`
4. **Delete `Kremer-Dev` (capital) remote branch** — clean up GitHub

---

## No Commits This Session (review only, except minor payroll interface fix)
