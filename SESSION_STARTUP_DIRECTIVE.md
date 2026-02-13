# Session Startup Directive - FieldMind

**Purpose:** Optimized startup protocol with maximum safety
**Version:** 1.0
**Project:** FieldMind
**Repository:** https://github.com/wtesolutions/FieldMind.git
**Safety Level:** Maximum
**Path:** C:\Users\Chris Kremer\Documents\GitHub\FieldMind

---

## 🚀 Startup Protocol

### Startup Modes (Choose Based on Session Type)

**Quick Mode (NEXT_STEPS only)** - 80% of sessions
- Use when: Resuming recent work, current tasks clear
- Load: `NEXT_STEPS.md` only (~400 tokens)
- Time: <5 seconds
- Best for: Continuation work, straightforward tasks

**Balanced Mode (Context + TODO)** - 15% of sessions
- Use when: Starting new phase, need full task context
- Load: MASTER_TODO + latest session + NEXT_STEPS (~3-5k tokens)
- Time: ~10 seconds
- Best for: Phase transitions, planning sessions

**Comprehensive Mode (Full Context)** - 5% of sessions
- Use when: Major planning, architecture decisions, complex analysis
- Load: All context (TODO + README + structure + session) (~8-12k tokens)
- Time: ~15 seconds
- Best for: Major planning, critical decisions

---

## 🚀 Startup Steps by Mode

### Quick Mode Steps (4 Steps) ⚡ FASTEST

**BEFORE STARTING: Verify this is a Quick Mode session**
- Resuming recent work? ✅ Quick Mode
- Tasks clear from previous session? ✅ Quick Mode
- Need full project context? ❌ Use Balanced Mode
- New phase or major planning? ❌ Use Comprehensive Mode

**If Quick Mode confirmed, proceed:**

**Step 1: Branch Safety** ⚠️ CRITICAL - MANDATORY (if git initialized)

```bash
# Check if git repository exists
git branch --show-current 2>/dev/null || echo "Not a git repository"
```

**Protected Branches (NO direct commits):**
- **Exact Match:** `main`, `master`, `dev`, `develop`
- **Contains Pattern:** `beta`, `stage`, `staging`, `production`, `prod`, `deploy`

**Safe Branches:** `feature/*`, `*dev*` (except `dev` alone), `fix/*`, `bugfix/*`, `hotfix/*`

**If Protected → MANDATORY Action:**
```bash
# CREATE new working branch IMMEDIATELY
git checkout -b feature/[FEATURE_NAME]
```

**Step 2: Sync with Remote** (if git repository exists)

```bash
git fetch origin && git pull origin $(git branch --show-current)
```

**Step 3: Load NEXT_STEPS.md ONLY** ⚠️ CRITICAL

**ALLOWED in Quick Mode:**
- ✅ `NEXT_STEPS.md` ONLY (~400 tokens)

**STRICTLY PROHIBITED in Quick Mode:**
- ❌ DO NOT READ `MASTER_TODO.md` (use Balanced Mode if needed)
- ❌ DO NOT READ `README.md`
- ❌ DO NOT READ session files
- ❌ DO NOT READ any documentation files
- ❌ DO NOT READ any other context files

**Rule:** Read EXACTLY ONE FILE: `NEXT_STEPS.md`. Nothing else.

**Verification:** Before Step 4, confirm only NEXT_STEPS.md was loaded.

**Step 4: Present Summary**

Show: Branch status, current phase, next 3-5 tasks, recent completion.

**Quick Mode Compliance Checklist:**
- [ ] Only NEXT_STEPS.md was read (NOT MASTER_TODO.md)
- [ ] Token usage at startup: <5,000 tokens
- [ ] Git safety checks completed
- [ ] Branch is safe for commits
- [ ] Summary presented to user

**If checklist fails:** Review mode selection and restart with correct mode.

---

### Balanced Mode Steps (5 Steps)

**Step 1-2:** Same as Quick Mode (branch safety + sync) - MANDATORY

**Step 3: Load Context Files**

**Required:**
1. **NEXT_STEPS.md** - Immediate tasks
2. **MASTER_TODO.md** - Full project context
3. **Latest Session** - `sessions/[LATEST].md`

**Optional:**
4. **README.md** - If structure questions exist

**Step 4-5:** Analysis and summary

---

### Comprehensive Mode Steps (6 Steps)

**Step 1-2:** Same as Quick Mode (branch safety + sync) - MANDATORY

**Step 3: Load Full Context**

**Load All:**
1. NEXT_STEPS.md
2. MASTER_TODO.md
3. Latest session summary
4. README.md
5. Relevant docs (deployment, architecture, etc.)

**Step 4-6:** Deep analysis, decision documentation, summary

---

## 📋 Startup Summary Format (All Modes)

```markdown
# Session Startup - FieldMind

**Branch:** [BRANCH] | **Status:** [✅ Safe / ⚠️ Protected / ℹ️ Not initialized]
**Phase:** [CURRENT_PHASE] ([PERCENT]% complete)
**Mode:** [Quick/Balanced/Comprehensive]

## Next Tasks
1. [TASK_1]
2. [TASK_2]
3. [TASK_3]

## Recent
- [LAST_SESSION_COMPLETION]

## Repository Status
[✅ Safe branch / ⚠️ PROTECTED - Action required / ℹ️ Git not initialized]

What would you like to focus on?
```

---

## ⚠️ Critical Rules - STRICTLY ENFORCED

### Git Prohibitions (MANDATORY)

**NEVER without EXPLICIT user confirmation:**
- ❌ Commit to protected branches (main, master, dev, *beta*, *stage*, *prod*, *deploy*)
- ❌ Force push to any branch (`--force`, `-f`)
- ❌ Delete remote branches
- ❌ Amend pushed commits (`--amend` after `git push`)
- ❌ Add "Co-Authored-By: Claude" or any AI attribution (ABSOLUTE PROHIBITION)
- ❌ Commit Claude Code attribution links in commits
- ❌ Commit secrets/credentials
- ❌ Squash merges (use merge commits for forward sync workflow)

### Git Requirements (MANDATORY)

**ALWAYS required:**
- ✅ Branch safety check at EVERY startup
- ✅ Sync with remote BEFORE starting work
- ✅ Conventional commit format: `type(scope): description`
  - Types: feat, fix, docs, test, chore, ci, refactor, perf, style
  - Minimum 10 characters
- ✅ Descriptive commit messages (explain WHY, not just WHAT)

### File Organization (MANDATORY)

**ALWAYS required:**
- ✅ Follow FILE_ORGANIZATION_DIRECTIVE for ALL file operations
- ✅ Session notes in `sessions/` directory ONLY
- ✅ Pattern: `sessions/YYYY-MM-DD_description.md`
- ✅ Documentation categorized by PURPOSE
- ✅ NO files in project root unless on allowed list

**Allowed Root Files ONLY:**
- README.md
- MASTER_TODO.md
- NEXT_STEPS.md
- .gitignore, .gitattributes
- LICENSE, CHANGELOG.md
- BHI.sln (solution file)
- *.csproj, *.sln, global.json (build files)

---

## 📂 Key Paths - FieldMind

**Planning:**
- TODO: `MASTER_TODO.md`
- Next Steps: `NEXT_STEPS.md`
- README: `README.md`

**Sessions:**
- Current: `sessions/`
- Archive: `docs/archive/`

**Documentation:**
- General: `docs/`
- Reports: `docs/reports/`
- Implementation: `docs/implementation/`
- Deployment: `docs/deployment/`
- Guides: `docs/guides/`

**Source Code:**
- (To be determined based on project type)

**Directives:**
- Active: `.claude/` directory
- Archive: `.claude/archive/`

---

## 🔄 Session End Protocol - MANDATORY

**Required at EVERY session end (NO EXCEPTIONS):**

1. **Update MASTER_TODO.md if major work** (phase completion, significant deliverables)
2. **Update NEXT_STEPS.md if significant work** (phase change, task completion)
3. **Create session summary** (MANDATORY - use SESSION_SUMMARY_TEMPLATE.md)
   - Save to: `sessions/YYYY-MM-DD_description.md`
4. **Verify checklist:**
   - [ ] NEXT_STEPS.md accurate
   - [ ] MASTER_TODO updated (if needed)
   - [ ] Session summary created
   - [ ] All commits pushed
   - [ ] On safe branch
5. **Push all commits** (REQUIRED)

**NEXT_STEPS.md Maintenance (CRITICAL):**
- Update: Date, phase, next tasks, recent completion, git status
- Keep: 5-7 next tasks only (immediate focus)
- Time: ~2 minutes
- **Update ALWAYS at:** Phase transitions, major milestones, significant completions

---

## 🎯 Mode Selection Guidance

### Use Quick Mode When:
- ✅ Resuming work from previous session
- ✅ Task list is clear and up-to-date
- ✅ No major context needed
- ✅ Continuation of current phase
- ✅ Time-sensitive tasks

### Use Balanced Mode When:
- 🔄 Starting new phase
- 🔄 Need project-wide context
- 🔄 Planning next steps
- 🔄 First session after break (>1 day)
- 🔄 Task dependencies unclear

### Use Comprehensive Mode When:
- 🚨 Major architectural decisions
- 🚨 Cross-phase planning
- 🚨 Repository-wide changes
- 🚨 First session on project
- 🚨 Critical decision points

---

## 📊 Token Budget Optimization

**Quick Mode:** ~400 tokens (NEXT_STEPS only)
- 93% reduction vs full context
- +4,900 tokens for work
- Fastest startup (<5s)

**Balanced Mode:** ~3-5k tokens (TODO + session + NEXT_STEPS)
- 60-70% reduction vs full context
- Good balance of context and efficiency
- Moderate startup (~10s)

**Comprehensive Mode:** ~8-12k tokens (all context)
- Full project understanding
- Use sparingly (5% of sessions)
- Slower startup (~15s)

**Target:** 80% Quick, 15% Balanced, 5% Comprehensive

---

## ⚡ Quick Reference

**Every Session Start:**
1. ⚠️ Check branch (MANDATORY)
2. 🔄 Sync with remote (REQUIRED)
3. 📖 Load NEXT_STEPS.md (or more if needed)
4. 📝 Present summary

**Every Session End:**
1. 📋 Update MASTER_TODO (if major work)
2. 📋 Update NEXT_STEPS (if significant)
3. ✍️ Create session summary (MANDATORY)
4. ✅ Verify checklist
5. ⬆️ Push commits (REQUIRED)

**Protected Branches (NO COMMITS):**
- main, master, dev, develop, *beta*, *stage*, *prod*, *deploy*

**Safe Branches:**
- feature/*, fix/*, bugfix/*, hotfix/*, *dev* (not "dev" alone)

**Commit Attribution Rule (ABSOLUTE):**
- NEVER add "Co-Authored-By: Claude" to any commit
- NEVER add Claude Code attribution links
- All commits must appear as authored solely by the human user

---

**FieldMind Startup Directive**
**Safety Tier:** Maximum | **Version:** 1.0
**Project Path:** C:\Users\Chris Kremer\Documents\GitHub\FieldMind
**Repository:** https://github.com/wtesolutions/FieldMind.git
