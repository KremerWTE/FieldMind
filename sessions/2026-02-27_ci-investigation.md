# FieldMind Development Session Notes
**Date:** February 27, 2026
**Duration:** Short session
**Status:** CI workflow removed pending npm workspace fix

---

## 🎯 Session Objectives

Diagnose and fix failing GitHub Actions CI workflow (Build Web App + Lint & Type Check jobs both failing).

---

## 📊 What Was Accomplished

### 1. CI Failure Diagnosis

**Symptoms:**
- `CI / Build Web App` — Failed in 4 seconds
- `CI / Lint & Type Check` — Failed in 4 seconds
- `CI / Build .NET API` — Succeeded in 24 seconds

**Root Causes Identified:**
1. **No `package-lock.json` in repo** — `npm ci` requires a lockfile and errors immediately without one (hence the 4-second failures).
2. **Wrong working directory for workspace install** — The `build-web` job used `defaults: working-directory: apps/web` for all steps including `npm ci`. In an npm workspace, the lockfile lives at the repo root; running `npm ci` inside a workspace subdirectory fails.

### 2. First Fix (commit `92bceef`)

- Generated `package-lock.json` at repo root using `npm install --package-lock-only`
- Updated `.github/workflows/ci.yml`:
  - Removed `defaults: working-directory: apps/web` from `build-web` job
  - Changed install to `npm ci` at root
  - Changed build to `npm run build -w @fieldmind/web` (workspace flag)

### 3. Second CI Run — Still Failing

After the fix, jobs now ran longer (36s / 33s vs 4s), confirming `npm ci` now works. But `Build Web App` still failed:

```
'next' is not recognized as an internal or external command
```

**Cause:** npm workspace hoisting — when `npm ci` installs at the root, `next` and other `apps/web` dependencies should hoist to `node_modules/.bin`, but something in the workspace/Turborepo config is preventing that. The binary isn't available when the build step runs.

Verified locally:
```
cd apps/web && npm run build
→ 'next' is not recognized as an internal or external command
```

### 4. CI Workflow Removed (commit `ab052a8`)

User decided to remove the CI workflow rather than debug the workspace hoisting issue now. The workflow will be re-added once the npm workspace setup is properly resolved.

---

## 📁 Files Changed

| File | Change |
|------|--------|
| `package-lock.json` | Added (generated at root, 703KB) |
| `.github/workflows/ci.yml` | Fixed workspace install structure, then deleted |

---

## 🔧 Technical Notes

### npm Workspace Hoisting Issue

The `apps/web` package declares `next` as a dependency. In a standard npm workspace, `npm ci` at the root should hoist `next` to `node_modules/.bin`. The failure suggests either:
- The workspace config isn't correctly recognized
- Turborepo's `turbo.json` is interfering
- `apps/web/node_modules` may need to exist for Next.js CLI resolution

**Fix options for next time:**
1. Add `"workspaces": ["apps/*", "packages/*"]` to root `package.json` and verify it's respected (already present — investigate further)
2. Try `npm install` (not `--package-lock-only`) locally and test `npm run build -w @fieldmind/web` from root
3. Try running `npx --prefix apps/web next build` in CI as a workaround
4. Check if Turborepo's `turbo run build` works in CI as an alternative to direct `npm run build`

---

## 🎯 Next Steps

1. **Resolve npm workspace build issue locally** before attempting CI again
2. **Re-add CI workflow** once `npm run build -w @fieldmind/web` works from repo root
3. **Main project priorities remain:** Docker setup → EF migrations → Web dashboard core features → Production deploy

---

## 📊 Project Status at Session End

- Backend API: **100%** ✅
- Mobile App: **100%** ✅
- Web App: **35%** (user management done; core features pending)
- CI/CD: **Removed** ⚠️ (needs workspace fix)
- Docker/Migrations: **Pending**
