# Session Startup Directive — FieldMind

**Purpose:** Startup protocol for every new session on this repository
**Status:** MANDATORY — execute at the start of every session
**Version:** 3.0

---

## Session Startup Protocol

### Step 1: Verify Project Context and Branch Safety

```bash
pwd
git branch --show-current
git status
```

**Expected:**
- Working directory: `C:\Users\Chris Kremer\Documents\GitHub\FieldMind`
- Active dev branch: `kremer-dev` (or feature branch)
- Remote: `https://github.com/KremerWTE/FieldMind.git`

**Protected Branches (NO DIRECT COMMITS):**
- `main` or `master`
- Any branch containing: `beta`, `stage`, `production`, `prod`, `deploy`

**If on protected branch, STOP and warn the user before proceeding.**

---

### Step 2: Sync with Remote

```bash
git fetch origin
CURRENT_BRANCH=$(git branch --show-current)
git pull origin $CURRENT_BRANCH
```

---

### Step 3: Load Project Context

Read in order:

1. **Latest session file** in `sessions/` (most recent `YYYY-MM-DD_*.md`)
2. **`MASTER_TODO.md`** — phase completion status and critical items
3. **`README.md`** — project overview and setup

---

### Step 4: Check Build Status

```bash
# .NET API
cd apps/api && dotnet build && cd ../..

# Node.js packages (web + shared)
npm run build
```

**Expected:** API builds with 0 errors. Node packages build successfully.

---

### Step 5: Check Docker Services

```bash
docker compose ps
```

**Services expected:**
| Service    | Port  | Purpose                    |
|------------|-------|----------------------------|
| timescaledb| 5432  | Primary database           |
| seq        | 5341  | Structured log aggregation |
| grafana    | 3002  | Metrics dashboards         |

**Note:** If Docker is not running, API will fail to start. Resolve before any backend work.

---

### Step 6: Present Session Startup Summary

```
# Session Startup — FieldMind

**Branch:** [current branch]
**Remote:** https://github.com/KremerWTE/FieldMind.git
**Branch Status:** [Safe / Protected - needs confirmation]
**Last Session:** [date from sessions/ or "No previous session found"]

## Context Loaded
- Latest session summary reviewed
- MASTER_TODO checked
- API build: [clean / errors]
- Node build: [clean / errors]
- Docker services: [running / stopped / not applicable]

## Current State
- Overall completion: [% from MASTER_TODO.md]
- Recent accomplishments: [from last session]
- Open items: [from last session or TODO]

## Recommended Next Steps
1. [Highest priority from MASTER_TODO]
2. [Second priority]
3. [Third priority]

What would you like to focus on this session?
```

---

## Project Overview

**Name:** FieldMind — AI-Powered Property Intelligence Platform
**Vision:** Enable field workers to capture, organize, and analyze job site photos with AI-powered insights for predictive maintenance and building health monitoring.

**Tech Stack:**
| Layer    | Technology                          |
|----------|-------------------------------------|
| API      | .NET 10, ASP.NET Core, EF Core      |
| Database | TimescaleDB (PostgreSQL 16)         |
| Mobile   | React Native / Expo                 |
| Web      | Next.js 15                          |
| Monorepo | Turborepo (npm)                     |
| AI       | OpenAI Vision (production), Mock (dev) |
| Jobs     | Hangfire                            |
| Logging  | Serilog → Seq                       |
| Metrics  | TimescaleDB + Grafana               |
| Storage  | AWS S3 (presigned URLs)             |

**Build commands:**
```bash
npm run build           # Turborepo root (web + packages)
cd apps/api && dotnet build  # .NET API
```

**Key directories:**
```
FieldMind/
├── .claude/            # Claude Code settings and commands
├── .github/            # GitHub Actions CI, issue/PR templates
├── apps/
│   ├── api/            # .NET 10 backend API
│   ├── mobile/         # React Native / Expo mobile app
│   └── web/            # Next.js 15 web app
├── data/
│   ├── migrations/     # EF Core migration scripts (reference copies)
│   └── seeds/          # Database seed data
├── docs/               # Project documentation
├── monitoring/         # Grafana dashboard configs
├── packages/
│   └── shared/         # Shared TypeScript packages
├── scripts/            # Setup and utility scripts
├── sessions/           # Session notes (YYYY-MM-DD_description.md)
└── src/                # Shared source utilities
```

**Key files:**
- `MASTER_TODO.md` — phase roadmap and completion tracker
- `SESSION_STARTUP_DIRECTIVE.md` — this file
- `docker-compose.yml` — local service orchestration
- `package.json` — Turborepo root config

---

## Critical Rules

### Git Workflow

**ALLOWED:**
- Commit to `kremer-dev` or feature branches
- Create PRs to `main` from feature branches

**FORBIDDEN (without explicit user confirmation):**
- Direct commits to `main` or `master`
- Force push to any branch
- Delete remote branches
- Amend commits that have been pushed

**Remote URL:** `https://github.com/KremerWTE/FieldMind.git`
**Default dev branch:** `kremer-dev`

### Commit Standards

**DO:**
- Use conventional commit format: `feat/fix/docs/test/chore`
- Keep commits focused and atomic

**NEVER:**
- Add "Co-Authored-By: Claude" or any AI attribution
- Commit secrets, API keys, or `.env` files

### Security-Sensitive Files
- `.env` files anywhere in the monorepo
- `appsettings*.json` with real credentials
- Never commit actual credentials or JWT secrets

---

## Session End Protocol

After significant work:

1. **Update** `MASTER_TODO.md` if tasks changed or completion % shifted
2. **Write** session summary: `sessions/YYYY-MM-DD_brief-description.md`
3. **Commit** staged changes with conventional commit message
4. **Update** `memory/MEMORY.md` → "Top Priorities for Next Session"

---

## Quick Verification Checklist

- [ ] Current branch identified and safety checked
- [ ] Remote URL verified: `https://github.com/KremerWTE/FieldMind.git`
- [ ] Synced with remote (`git pull` completed)
- [ ] Latest session file in `sessions/` reviewed
- [ ] `MASTER_TODO.md` checked for current phase
- [ ] API build verified (`dotnet build`)
- [ ] Node build verified (`npm run build`)
- [ ] Docker services status noted
- [ ] Session startup summary presented to user

---

**Created:** 2026-02-24
**Updated:** 2026-02-27
**Version:** 3.0
**Project:** FieldMind — AI-Powered Property Intelligence Platform
**Remote:** https://github.com/KremerWTE/FieldMind.git
**Dev Branch:** `kremer-dev`
