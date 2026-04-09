# /karimo:dashboard — Comprehensive CLI Dashboard for KARIMO Monitoring

**Phase 3 monitoring** — System health, execution insights, and velocity analytics.

## Usage

```bash
/karimo:dashboard              # Full dashboard (all 5 sections)
/karimo:dashboard --active     # Show only active PRDs with progress
/karimo:dashboard --blocked    # Show only blocked tasks
/karimo:dashboard --deps       # Show cross-PRD dependency graph
/karimo:dashboard --prd {slug} # PRD-specific dashboard (combines status + metrics)
/karimo:dashboard --alerts     # Show only Critical Alerts section (minimal mode)
/karimo:dashboard --activity   # Extended activity feed (last 50 events instead of 10)
/karimo:dashboard --reconcile  # Force git state reconstruction
/karimo:dashboard --json       # JSON output for scripting/automation
/karimo:dashboard --refresh    # Force refresh (bypass cache)
```

## Purpose

**Primary monitoring touchpoint** for active development and post-execution analysis.

Provides:
- **Executive Summary** — System health score, quick stats, next completions
- **Critical Alerts** — Blocked, stale, crashed tasks needing immediate attention
- **Execution Velocity** — Completion rate, loop efficiency, wave progress, ETAs
- **Resource Usage** — Model distribution, loop distribution, parallel capacity
- **Recent Activity** — Timeline of events across all PRDs

---

## Dashboard Output (Default View)

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard                              Updated: 45s ago    │
│  System Health: ████████░░ 85%                 Active: 2 PRDs      │
╰────────────────────────────────────────────────────────────────────╯

📊 QUICK SUMMARY
────────────────
  PRDs:       3 total (2 active, 1 complete)
  Tasks:      42 total (28 done, 8 running, 4 queued, 2 blocked)
  Progress:   ████████░░ 67% complete
  Models:     28 Sonnet, 12 Opus (30% escalation rate)

  ✅ Next completions:
    • user-profiles Wave 2 (~2h, 1 task remaining)
    • token-studio Wave 1 (~6h, 6 tasks queued)


🚨 CRITICAL ALERTS — Needs Immediate Attention
───────────────────────────────────────────────

  [user-profiles / 2a] BLOCKED — 3 failed Greptile attempts
    → PR #44 needs human review
    → Blocked for: 2h 15m
    → Action: gh pr view 44

  [token-studio / 1c] STALE — Running for 6h 23m
    → Agent may have crashed
    → Action: /karimo:run --prd token-studio --task 1c

  Total: 2 items requiring human intervention


📊 EXECUTION VELOCITY — Last 7 Days
────────────────────────────────────

  Completion Rate:    ████████████░░ 42 tasks (6/day avg)
  Loop Efficiency:    ████████░░░░░ 2.8 avg (improving ↓)
  First-Time Pass:    █████░░░░░░░ 45% (↑ from 38%)
  Review Pass Rate:   ██████████░░ 82% (Greptile avg: 3.2)

  Wave Progress:
    user-profiles:    Wave 2 of 3  ████████░░ 80%
    token-studio:     Wave 1 of 4  ███░░░░░░░ 25%

  ETA Projections:
    user-profiles:    ~2h (Wave 2: 1 task remaining)
    token-studio:     ~6h (Wave 1: 6 tasks queued)


⚙️  RESOURCE USAGE — Current Cycle
──────────────────────────────────

  Model Distribution:   Sonnet: 28 tasks (70%)  Opus: 12 tasks (30%)
  Escalations:          4 tasks (10% escalation rate)
  Parallel Capacity:    2/3 slots utilized (67%)

  Loop Distribution:
    1 loop:  ████████████████ 20 tasks (50%)
    2 loops: ████████ 12 tasks (30%)
    3 loops: ████ 6 tasks (15%)
    4+ loops: ██ 2 tasks (5%)  ← Learning candidates


📋 RECENT ACTIVITY — Last 10 Events
────────────────────────────────────

  3m ago   [user-profiles] Task 2c completed (PR #46 merged)
  12m ago  [token-studio] Task 1b needs revision (Greptile: 2/5)
  15m ago  [user-profiles] Wave 2 completed
  28m ago  [token-studio] Task 1a escalated (sonnet → opus)
  1h ago   [user-profiles] Task 2b completed (PR #45 merged)
```

---

## Section 1: Executive Summary

**Purpose:** High-level system health and quick stats at a glance.

### Data Sources

**CRITICAL: Git is the source of truth. status.json is derived/cached metadata only.**

1. **Derive task completion from git history** (immune to agent confusion)
   ```bash
   for prd_dir in .karimo/prds/*/; do
     prd_slug=$(basename "$prd_dir")
     feature_branch=$(jq -r '.feature_branch // "main"' "${prd_dir}status.json")

     # Get all task IDs from commits on feature branch
     completed_tasks=$(git log --oneline "$feature_branch" --not main | \
       grep -oE '\([T0-9]+[a-z]\)' | \
       sed 's/[()]//g' | \
       sort -u)

     # Get total tasks from tasks.yaml
     total_tasks=$(yq '.tasks | length' "${prd_dir}tasks.yaml")

     # Calculate completion percentage
     completed_count=$(echo "$completed_tasks" | wc -l)
     completion_pct=$(( completed_count * 100 / total_tasks ))

     echo "$prd_slug: $completed_count/$total_tasks ($completion_pct%)"
   done
   ```

2. **Validate status.json against git** (detect drift)
   ```bash
   # For each PRD, compare status.json against git reality
   for prd_dir in .karimo/prds/*/; do
     prd_slug=$(basename "$prd_dir")

     # Get task statuses from status.json
     status_json_tasks=$(jq -r '.tasks | to_entries[] | "\(.key):\(.value.status)"' \
       "${prd_dir}status.json")

     # Get actual status from git/GitHub
     for task_entry in $status_json_tasks; do
       task_id=$(echo "$task_entry" | cut -d: -f1)
       cached_status=$(echo "$task_entry" | cut -d: -f2)

       # Derive actual status from git
       branch="worktree/${prd_slug}-${task_id}"
       if git show-ref --verify --quiet "refs/heads/$branch"; then
         pr_state=$(gh pr view "$branch" --json state,mergedAt --jq '.state,.mergedAt' 2>/dev/null)
         # Compare and detect drift
       fi
     done
   done
   ```

3. **Calculate cross-PRD metrics**
   ```javascript
   const totalTasks = allPRDs.reduce((sum, prd) => sum + prd.tasks.length, 0);
   const doneTasks = allPRDs.reduce((sum, prd) =>
     sum + prd.tasks.filter(t => t.status === 'done').length, 0);
   const completionPercent = (doneTasks / totalTasks) * 100;
   ```

3. **Calculate health score (0-100)**
   ```javascript
   const healthScore = (
     (taskSuccessRate * 0.30) +        // 30% weight
     (reviewEfficiency * 0.25) +       // 25% weight
     (stalledTaskPenalty * 0.20) +     // 20% weight
     (parallelUtilization * 0.15) +    // 15% weight
     (blockedTaskPenalty * 0.10)       // 10% weight
   );

   // Components:
   // taskSuccessRate = done_tasks / total_tasks
   // reviewEfficiency = 100 - (avg_loops * 20)
   // stalledTaskPenalty = 100 - (stalled_count * 20)
   // parallelUtilization = active_tasks / max_parallel
   // blockedTaskPenalty = 100 - (blocked_count * 30)
   ```

4. **Model distribution**
   ```javascript
   const sonnetCount = tasks.filter(t => t.model === 'sonnet').length;
   const opusCount = tasks.filter(t => t.model === 'opus').length;
   const escalationRate = (escalations / totalTasks) * 100;
   ```

5. **ETA projections**
   ```javascript
   // For each active PRD
   const remainingTasks = currentWaveTasks.filter(t => t.status !== 'done').length;
   const avgTaskDuration = calculateAvgDuration(completedTasks);
   const eta = remainingTasks * avgTaskDuration;
   ```

### Output Format

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard                              Updated: {ago}      │
│  System Health: {████████░░} {score}%          Active: {n} PRDs    │
╰────────────────────────────────────────────────────────────────────╯

📊 QUICK SUMMARY
────────────────
  PRDs:       {total} total ({active} active, {complete} complete)
  Tasks:      {total} total ({done} done, {running} running, {queued} queued, {blocked} blocked)
  Progress:   {████████░░} {percent}% complete
  Models:     {sonnet} Sonnet, {opus} Opus ({rate}% escalation rate)

  ✅ Next completions:
    • {prd-slug} Wave {n} (~{eta}, {count} task{s} remaining)
    • {prd-slug} Wave {n} (~{eta}, {count} task{s} queued)
```

---

## Section 2: Critical Alerts

**Purpose:** Surface tasks requiring immediate human intervention.

### Alert Types

| Alert | Trigger | Action |
|-------|---------|--------|
| **BLOCKED** | Task status `needs-human-review` (3+ failed Greptile attempts) | Review PR manually |
| **STALE** | Task `running` > 4h or `in-review` > 48h | Re-run execution or review PR |
| **CRASHED** | Branch exists without corresponding PR | Re-run execution for task |
| **CONFLICTS** | PR has merge conflicts | Manual rebase required |
| **ORPHANED** | Worktree branch for deleted PRD | Run /karimo:doctor --fix to clean up |

### Data Sources

1. **Blocked tasks** — status.json where `task.status === 'needs-human-review'`
2. **Stale tasks** — Compare `task.started_at` to current time
3. **Crashed tasks** — Git branch exists but no PR found via `gh pr list --head {branch}`
4. **Conflicts** — GitHub PR status shows mergeable: false
5. **Orphaned worktrees** — Git branches matching `worktree/*` for deleted PRDs

### Query Logic

```bash
# Check for blocked tasks
jq -r '.tasks | to_entries[] | select(.value.status == "needs-human-review") | .key' status.json

# Check for stale tasks
current_time=$(date +%s)
started_at=$(jq -r ".tasks[\"$task_id\"].started_at" status.json | date -f - +%s)
duration=$((current_time - started_at))
if [ $duration -gt 14400 ]; then
  echo "STALE: $task_id running for $(($duration / 3600))h"
fi

# Check for crashed tasks
for task_id in $(get_task_ids); do
  branch="${prd_slug}-${task_id}"
  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    pr_exists=$(gh pr list --head "$branch" --json number --jq '.[0].number')
    if [ -z "$pr_exists" ]; then
      echo "CRASHED: $task_id (branch exists, no PR)"
    fi
  fi
done

# Check for conflicts
gh pr view $pr_number --json mergeable --jq '.mergeable' | grep -q false

# Check for orphaned worktrees (git-native detection)
orphan_count=0
for branch in $(git branch --list 'worktree/*' --format='%(refname:short)'); do
  # Extract PRD slug (task ID is always {digit}{letter} at end)
  prd_slug=$(echo "$branch" | sed 's|worktree/\(.*\)-[0-9][a-z]$|\1|')

  # Count as orphan if PRD deleted OR no open PR
  if [ ! -d ".karimo/prds/$prd_slug" ] || \
     ! gh pr list --head "$branch" --state open --json number -q '.[0].number' >/dev/null 2>&1; then
    orphan_count=$((orphan_count + 1))
  fi
done

if [ $orphan_count -gt 0 ]; then
  echo "ORPHANED: $orphan_count worktree branches detected"
  echo "Run: /karimo:doctor --fix to clean up"
fi
```

### Output Format

```
🚨 CRITICAL ALERTS — Needs Immediate Attention
───────────────────────────────────────────────

  [{prd-slug} / {task-id}] BLOCKED — 3 failed Greptile attempts
    → PR #{number} needs human review
    → Blocked for: {duration}
    → Action: gh pr view {number}

  [{prd-slug} / {task-id}] STALE — Running for {duration}
    → Agent may have crashed
    → Action: /karimo:run --prd {slug} --task {id}

  [{prd-slug} / {task-id}] CRASHED — Branch exists without PR
    → Execution interrupted
    → Action: /karimo:run --prd {slug} --task {id}

  [{prd-slug} / {task-id}] CONFLICTS — Merge conflicts need resolution
    → Files: {file1}, {file2}
    → Action: Manual rebase required

  Total: {count} items requiring human intervention
```

**If no alerts:**
```
🚨 CRITICAL ALERTS

  No items requiring attention ✓
```

---

## Section 3: Execution Velocity

**Purpose:** Track completion rate, loop efficiency, and project ETAs.

### Metrics

#### Completion Rate
```javascript
// Tasks completed in last 7 days
const completedLast7Days = tasks.filter(t =>
  t.status === 'done' &&
  daysSince(t.completed_at) <= 7
);
const dailyAvg = completedLast7Days.length / 7;
```

#### Loop Efficiency
```javascript
// Average loops per task
const avgLoops = tasks.reduce((sum, t) => sum + t.loops, 0) / tasks.length;

// Trend (compare current vs historical)
const historicalAvg = calculateHistoricalAvg(completedPRDs);
const trend = avgLoops < historicalAvg ? "improving ↓" : "declining ↑";
```

#### First-Time Pass Rate
```javascript
const firstTimePass = tasks.filter(t => t.loops === 1).length / tasks.length * 100;
```

#### Review Pass Rate (Greptile)
```javascript
// % of tasks that pass Greptile on first attempt
const firstAttemptPass = tasks.filter(t =>
  t.greptile_scores && t.greptile_scores[0] >= 3
).length;
const passRate = (firstAttemptPass / tasks.length) * 100;
```

#### Wave Progress
```javascript
// Per-PRD wave completion
for (const prd of activePRDs) {
  const currentWave = prd.waves.find(w => w.status === 'running');
  const waveProgress = currentWave.tasks.filter(t => t.status === 'done').length / currentWave.tasks.length;
}
```

#### ETA Projections
```javascript
// Based on current velocity
const remainingTasksInWave = currentWave.tasks.filter(t => t.status !== 'done').length;
const avgTaskDuration = calculateAvgDuration(completedTasks);
const eta = remainingTasksInWave * avgTaskDuration;
```

### Data Sources

1. **status.json** — Task completion timestamps, wave statuses
2. **metrics.json** — Loops, Greptile scores per completed PRD
3. **Historical data** — Aggregate from all completed PRDs for trend analysis

### Output Format

```
📊 EXECUTION VELOCITY — Last 7 Days
────────────────────────────────────

  Completion Rate:    {████████████░░} {count} tasks ({avg}/day avg)
  Loop Efficiency:    {████████░░░░░} {avg} avg ({trend})
  First-Time Pass:    {█████░░░░░░░} {percent}% (↑ from {historical}%)
  Review Pass Rate:   {██████████░░} {percent}% (Greptile avg: {score})

  Wave Progress:
    {prd-slug}:    Wave {n} of {total}  {████████░░} {percent}%
    {prd-slug}:    Wave {n} of {total}  {███░░░░░░░} {percent}%

  ETA Projections:
    {prd-slug}:    ~{hours}h (Wave {n}: {count} task{s} remaining)
    {prd-slug}:    ~{hours}h (Wave {n}: {count} task{s} queued)
```

---

## Section 4: Resource Usage

**Purpose:** Model distribution, loop patterns, parallel capacity utilization.

### Metrics

#### Model Distribution
```javascript
const sonnetCount = tasks.filter(t => t.model === 'sonnet').length;
const opusCount = tasks.filter(t => t.model === 'opus').length;
const sonnetPercent = (sonnetCount / tasks.length) * 100;
const opusPercent = (opusCount / tasks.length) * 100;
```

#### Escalations
```javascript
const escalations = tasks.filter(t => t.escalated).length;
const escalationRate = (escalations / tasks.length) * 100;
```

#### Parallel Capacity
```javascript
const activeTasks = tasks.filter(t => t.status === 'running').length;
const maxParallel = config.execution.max_parallel || 3;
const utilization = (activeTasks / maxParallel) * 100;
```

#### Loop Distribution
```javascript
const loopBuckets = {
  '1': tasks.filter(t => t.loops === 1).length,
  '2': tasks.filter(t => t.loops === 2).length,
  '3': tasks.filter(t => t.loops === 3).length,
  '4+': tasks.filter(t => t.loops >= 4).length
};
```

### Data Sources

1. **status.json** — `task.model`, `task.loops` fields
2. **metrics.json** — Escalations array
3. **config.yaml** — `max_parallel` setting

### Output Format

```
⚙️  RESOURCE USAGE — Current Cycle
──────────────────────────────────

  Model Distribution:   Sonnet: {count} tasks ({percent}%)  Opus: {count} tasks ({percent}%)
  Escalations:          {count} tasks ({rate}% escalation rate)
  Parallel Capacity:    {active}/{max} slots utilized ({percent}%)

  Loop Distribution:
    1 loop:  {████████████████} {count} tasks ({percent}%)
    2 loops: {████████} {count} tasks ({percent}%)
    3 loops: {████} {count} tasks ({percent}%)
    4+ loops: {██} {count} tasks ({percent}%)  ← Learning candidates
```

---

## Section 5: Recent Activity

**Purpose:** Timeline of events across all PRDs.

### Event Types

| Event | Source | Format |
|-------|--------|--------|
| Task completed | `task.merged_at` | `[{prd}] Task {id} completed (PR #{n} merged)` |
| Task needs revision | `task.status === 'needs-revision'` | `[{prd}] Task {id} needs revision (Greptile: {score}/5)` |
| Wave completed | `wave.status === 'complete'` | `[{prd}] Wave {n} completed` |
| Model escalation | `metrics.escalations[]` | `[{prd}] Task {id} escalated ({from} → {to})` |
| Task started | `task.started_at` | `[{prd}] Task {id} started` |
| PR created | `task.pr_number` | `[{prd}] Task {id} PR #{n} created` |

### Data Sources

1. **Aggregate events from all PRDs**
   ```javascript
   const events = [];

   for (const prd of allPRDs) {
     // Task completions
     prd.tasks.filter(t => t.merged_at).forEach(t => {
       events.push({
         timestamp: t.merged_at,
         type: 'task_completed',
         prd: prd.slug,
         task: t.id,
         pr: t.pr_number
       });
     });

     // Escalations
     if (prd.metrics?.escalations) {
       prd.metrics.escalations.forEach(e => {
         events.push({
           timestamp: estimateEscalationTime(e),
           type: 'escalation',
           prd: prd.slug,
           task: e.task_id,
           from: e.from,
           to: e.to
         });
       });
     }

     // Wave completions
     Object.entries(prd.waves).forEach(([waveNum, wave]) => {
       if (wave.status === 'complete') {
         events.push({
           timestamp: calculateWaveCompletionTime(wave),
           type: 'wave_completed',
           prd: prd.slug,
           wave: waveNum
         });
       }
     });
   }

   // Sort by timestamp descending
   events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
   ```

2. **Format with relative time**
   ```javascript
   function formatRelativeTime(timestamp) {
     const seconds = (Date.now() - new Date(timestamp)) / 1000;
     if (seconds < 60) return `${Math.floor(seconds)}s ago`;
     if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
     if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
     return `${Math.floor(seconds / 86400)}d ago`;
   }
   ```

### Output Format

```
📋 RECENT ACTIVITY — Last 10 Events
────────────────────────────────────

  {time} ago   [{prd-slug}] Task {id} completed (PR #{n} merged)
  {time} ago   [{prd-slug}] Task {id} needs revision (Greptile: {score}/5)
  {time} ago   [{prd-slug}] Wave {n} completed
  {time} ago   [{prd-slug}] Task {id} escalated ({from} → {to})
  {time} ago   [{prd-slug}] Task {id} completed (PR #{n} merged)
```

**With `--activity` flag (last 50 events):**
```
📋 RECENT ACTIVITY — Last 50 Events
────────────────────────────────────

  {time} ago   [{prd-slug}] Task {id} completed (PR #{n} merged)
  ...
  (50 total events)
```

---

## Command Flags

### `--active`

Show only active PRDs (inherited from overview):

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard — Active PRDs                                    │
╰────────────────────────────────────────────────────────────────────╯

  user-profiles     67% (4/6)     2 blocked, 0 in progress
  token-studio      25% (2/8)     1 in revision

Summary: 2 active PRDs
```

### `--blocked`

Show only blocked tasks (inherited from overview):

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard — Blocked Tasks                                  │
╰────────────────────────────────────────────────────────────────────╯

🚨 CRITICAL ALERTS

  [user-profiles / 2a] BLOCKED — 3 failed Greptile attempts
    → PR #44 needs human review
    → Action: gh pr view 44

Summary: 2 blocked tasks across 1 PRD
```

### `--deps`

Show cross-PRD dependency graph (inherited from overview):

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Dashboard — Cross-PRD Dependencies                         │
╰────────────────────────────────────────────────────────────────────╯

📊 Dependency Graph
───────────────────

  token-studio
  └── user-profiles (blocks execution)
      └── Listed in cross_feature_blockers
      └── Runtime discovery: "Auth middleware needed" (from 2a)

  notification-system
  └── user-profiles (blocks execution)
      └── Listed in cross_feature_blockers


⚠️  Dependency Issues
────────────────────

  token-studio
    → Blocked by: user-profiles (status: running, 67% complete)
    → Recommendation: Wait for user-profiles to complete


📋 Recommended Execution Order
──────────────────────────────

  1. user-profiles          ← Currently running (67%)
  2. token-studio           ← Ready, waiting on (1)
  3. notification-system    ← Ready, waiting on (1)

Summary: 3 PRDs with dependencies · 1 running · 2 blocked
```

### `--prd {slug}`

PRD-specific dashboard (combines status + metrics + context):

```
╭────────────────────────────────────────────────────────────────────╮
│  PRD Dashboard: user-profiles                                      │
╰────────────────────────────────────────────────────────────────────╯

Status: active
Execution Mode: Feature Branch (feature/user-profiles)
Started: 2h 15m ago
Progress: ████████░░ 80% (4/5 tasks)

📊 Metrics:
  Models: 3 Sonnet, 1 Opus (1 escalation)
  Loops: 9 total (2.25 avg per task)
  Greptile: 3.5 avg final score

🚨 Alerts:
  None ✓

📋 Recent Activity:
  15m ago  Wave 2 completed
  20m ago  Task 2c completed (PR #46 merged)
  1h ago   Task 2b completed (PR #45 merged)
```

### `--alerts`

Show only Critical Alerts section (minimal mode):

```
╭────────────────────────────────────────────────────────────────────╮
│  KARIMO Alerts                                                     │
╰────────────────────────────────────────────────────────────────────╯

🚨 CRITICAL ALERTS

  [user-profiles / 2a] BLOCKED — 3 failed Greptile attempts
    → PR #44 needs human review
    → Action: gh pr view 44

  Total: 1 item requiring human intervention
```

### `--activity`

Extended activity feed (last 50 events instead of 10):

```
📋 RECENT ACTIVITY — Last 50 Events
────────────────────────────────────

  3m ago   [user-profiles] Task 2c completed (PR #46 merged)
  ...
  (50 total events)
```

### `--json`

JSON output for scripting/automation:

```json
{
  "generated_at": "2026-03-11T10:45:00Z",
  "cache_age_seconds": 45,
  "health_score": 85,
  "summary": {
    "prds": {
      "total": 3,
      "active": 2,
      "complete": 1
    },
    "tasks": {
      "total": 42,
      "done": 28,
      "running": 8,
      "queued": 4,
      "blocked": 2
    },
    "progress_percent": 67,
    "models": {
      "sonnet": 28,
      "opus": 12,
      "escalation_rate": 30
    }
  },
  "alerts": [
    {
      "type": "blocked",
      "prd_slug": "user-profiles",
      "task_id": "2a",
      "pr_number": 44,
      "blocked_duration_seconds": 8100,
      "action": "gh pr view 44"
    }
  ],
  "velocity": {
    "completion_rate_per_day": 6,
    "avg_loops": 2.8,
    "first_time_pass_rate": 45,
    "review_pass_rate": 82,
    "waves": [
      {
        "prd_slug": "user-profiles",
        "current_wave": 2,
        "total_waves": 3,
        "progress_percent": 80
      }
    ],
    "etas": [
      {
        "prd_slug": "user-profiles",
        "wave": 2,
        "eta_hours": 2,
        "remaining_tasks": 1
      }
    ]
  },
  "resources": {
    "model_distribution": {
      "sonnet": { "count": 28, "percent": 70 },
      "opus": { "count": 12, "percent": 30 }
    },
    "escalations": { "count": 4, "rate": 10 },
    "parallel_capacity": {
      "active": 2,
      "max": 3,
      "utilization_percent": 67
    },
    "loop_distribution": {
      "1": { "count": 20, "percent": 50 },
      "2": { "count": 12, "percent": 30 },
      "3": { "count": 6, "percent": 15 },
      "4+": { "count": 2, "percent": 5 }
    }
  },
  "recent_activity": [
    {
      "timestamp": "2026-03-11T10:42:00Z",
      "relative_time": "3m ago",
      "type": "task_completed",
      "prd_slug": "user-profiles",
      "task_id": "2c",
      "pr_number": 46
    }
  ]
}
```

### `--reconcile`

Force git state reconstruction:

```bash
/karimo:dashboard --reconcile
```

Derives actual state from git and GitHub, not just status.json. If status.json conflicts with git reality, git wins and status.json is updated.

**Reconciliation Report:**

```
Reconciliation Report for: user-profiles

  [1a] status.json: running → git: merged (PR #42) → UPDATED to done
  [1b] status.json: queued → git: no branch → OK
  [2a] status.json: running → git: branch exists, no PR → CRASHED
       Action: Will delete stale branch on next execute

  Discrepancies found: 2
  status.json updated: ✓
```

This flag is useful for recovering from crashes or when status.json gets out of sync with git reality.

### `--refresh`

Force refresh (bypass cache):

```bash
/karimo:dashboard --refresh
```

Bypasses the 2-minute dashboard cache and re-computes all metrics from scratch.

---

## Caching Strategy

### Cache File Location

`.karimo/dashboard-cache.json`

### Cache Structure

```json
{
  "generated_at": "2026-03-11T10:45:00Z",
  "ttl_seconds": 120,
  "data": {
    "summary": { ... },
    "alerts": [ ... ],
    "velocity": { ... },
    "resources": { ... },
    "recent_activity": [ ... ]
  }
}
```

### Cache Logic

```bash
# Check cache validity
cache_file=".karimo/dashboard-cache.json"
if [ -f "$cache_file" ] && [ "$refresh_flag" != "true" ]; then
  generated_at=$(jq -r '.generated_at' "$cache_file")
  cache_age=$(($(date +%s) - $(date -d "$generated_at" +%s)))

  if [ $cache_age -lt 120 ]; then
    # Use cached data
    jq -r '.data' "$cache_file"
    exit 0
  fi
fi

# Otherwise, regenerate
generate_dashboard_data > "$cache_file"
```

### Cache Invalidation

Cache is invalidated on:
- Any `/karimo:run` run
- Any status.json update
- Manual `--refresh` flag
- Cache age > 2 minutes

---

## Performance Optimization

### Parallel GitHub Queries

```bash
# Fetch all PR data in parallel
gh api --parallel \
  "repos/{owner}/{repo}/pulls/$pr1" \
  "repos/{owner}/{repo}/pulls/$pr2" \
  "repos/{owner}/{repo}/pulls/$pr3"
```

### Incremental Updates

```javascript
// Only fetch PRDs that changed since last dashboard run
const lastRun = cache.generated_at;
const changedPRDs = allPRDs.filter(prd =>
  new Date(prd.status.updated_at) > new Date(lastRun)
);
```

### Lazy Loading

```javascript
// Don't calculate velocity metrics unless dashboard is being rendered
if (showVelocitySection) {
  calculateVelocityMetrics();
}
```

### Performance Targets

- < 2 seconds for dashboard render (3 active PRDs)
- < 5 seconds with 10+ PRDs
- < 1 second with valid cache

---

## Empty States

### No Active PRDs

```
No active PRDs found.

Create one with: /karimo:plan
Execute one with: /karimo:run --prd {slug}
```

### No Alerts

```
🚨 CRITICAL ALERTS

  No items requiring attention ✓
```

### No Recent Activity

```
📋 RECENT ACTIVITY

  No recent activity found.
```

---

## Integration with Existing Commands

### Workflow

**Active monitoring (during execution):**
```bash
/karimo:dashboard           # System health, what needs attention, progress
/karimo:dashboard --prd X   # Wave-level task details (deep dive)
/karimo:run --prd X         # Resume/start execution
```

**Post-execution analysis:**
```bash
/karimo:dashboard --activity # Review execution history
/karimo:dashboard --prd X    # PRD-specific metrics and insights
/karimo:feedback             # Capture learnings
```

### Command Relationship

| Command | Focus | When to Use |
|---------|-------|-------------|
| `/karimo:dashboard` | Cross-PRD overview, health, velocity, alerts | Active monitoring, post-execution analysis |
| `/karimo:dashboard --prd X` | Single PRD deep dive, wave details | Debugging specific PRD, wave-level task tracking |

---

## Data Flow

1. **Load PRD Data**
   - Scan `.karimo/prds/*/status.json` files
   - Load corresponding PRD YAML files for context
   - Load `metrics.json` for completed PRDs

2. **Reconcile with Git State**
   - For each active PRD, derive truth from git (using `--reconcile` logic)
   - Query GitHub API for PR states, labels, merge status
   - Update `status.json` if discrepancies found

3. **Calculate Aggregated Metrics**
   - Cross-PRD totals (tasks, PRDs, completion %)
   - Health score (0-100 based on success rate, stalled/blocked counts)
   - Velocity trends (completion rate, loop efficiency)
   - Resource usage (model distribution, parallel utilization)

4. **Generate Activity Timeline**
   - Collect events from all PRDs
   - Sort by timestamp (most recent first)
   - Format with relative time ("3m ago", "2h ago")

5. **Render Dashboard**
   - Format each section with Unicode box drawing and progress bars
   - Use Unicode box drawing and progress bars for rendering
   - Output to stdout

---

## Git State Reconciliation

**Principle:** Git is truth. status.json is a cache.

The dashboard uses git-based state reconciliation (triggered via `--reconcile` flag):

```bash
for task_id in tasks; do
  branch="${prd_slug}-${task_id}"

  if git ls-remote --heads origin "$branch" | grep -q "$branch"; then
    pr_data=$(gh pr list --head "$branch" --json state,number,mergedAt --jq '.[0]')

    if [ -n "$pr_data" ]; then
      state=$(echo "$pr_data" | jq -r '.state')
      if [ "$state" = "MERGED" ]; then
        derived_status="done"
      else
        labels=$(gh pr view "$branch" --json labels --jq '.labels[].name')
        if echo "$labels" | grep -q "needs-revision"; then
          derived_status="needs-revision"
        else
          derived_status="in-review"
        fi
      fi
    else
      # Branch exists, no PR → crashed
      derived_status="crashed"
    fi
  else
    # No branch = queued or done (if status.json says done)
    current=$(get_status_from_json "$task_id")
    derived_status=$([ "$current" = "done" ] && echo "done" || echo "queued")
  fi

  # Update status.json if reconciliation found discrepancy
  if [ "$derived_status" != "$(get_status_from_json "$task_id")" ]; then
    update_status_json "$task_id" "$derived_status"
  fi
done
```

---

## Related Commands

| Command | Purpose |
|---------|---------|
| `/karimo:plan` | Create PRD with interactive approval |
| `/karimo:run` | Execute PRD (brief gen + execution) |
| `/karimo:doctor` | Check installation health |
| `/karimo:feedback` | Capture learnings from execution |

---

## Migration from `/karimo:status`

### Deprecated Command

`/karimo:status` is deprecated and replaced by `/karimo:dashboard`.

All flags from `/karimo:status` are preserved:

| Old Command | New Command |
|-------------|-------------|
| `/karimo:status` | `/karimo:dashboard` |
| `/karimo:status --prd X` | `/karimo:dashboard --prd X` |
| `/karimo:status --active` | `/karimo:dashboard --active` |
| `/karimo:status --reconcile` | `/karimo:dashboard --reconcile` |
| `/karimo:status --json` | `/karimo:dashboard --json` |

### Transition Path

1. **Existing scripts** — Replace `/karimo:status` with `/karimo:dashboard`
2. **Functionality preserved** — All status features are available in dashboard
3. **Enhanced capabilities** — Dashboard adds velocity, resource usage, and activity sections

---

## Migration from `/karimo-overview`

### Deprecated Command

`/karimo-overview` is deprecated and replaced by `/karimo:dashboard`.

All flags from `/karimo-overview` are preserved:
- `--blocked` → Retained (show only blocked tasks)
- `--active` → Retained (show only active PRDs)
- `--deps` → Retained (show dependency graph)

### Transition Path

1. **Existing scripts** — Replace `/karimo-overview` with `/karimo:dashboard`
2. **Functionality preserved** — All overview features are now in the "Critical Alerts" section
3. **Enhanced capabilities** — Dashboard adds 4 new sections for comprehensive monitoring

**Old:**
```bash
/karimo-overview              # Blocked tasks, revision loops, recently completed
/karimo-overview --blocked    # Only blocked tasks
/karimo-overview --active     # Only active PRDs
/karimo-overview --deps       # Dependency graph
```

**New:**
```bash
/karimo:dashboard             # Full dashboard (5 sections)
/karimo:dashboard --blocked   # Only blocked tasks
/karimo:dashboard --active    # Only active PRDs
/karimo:dashboard --deps      # Dependency graph
/karimo:dashboard --alerts    # Minimal mode (alerts only)
/karimo:dashboard --prd X     # PRD-specific dashboard
```

---

*Generated by [KARIMO v5.0](https://github.com/opensesh/KARIMO)*
