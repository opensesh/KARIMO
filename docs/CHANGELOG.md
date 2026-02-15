# Changelog

All notable changes to KARIMO will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Initial repository scaffolding (Phase 1)
- TypeScript type definitions for all modules
- Project configuration templates
- Documentation structure

---

## Architecture Spec Versions

### v1.2 (February 2026)

#### Added
- Aggregate budget caps (phase + session level)
- `phase_budget_cap` with configurable overflow for running tasks
- `session_budget_cap` as hard ceiling for orchestrator invocations
- `budget_warning_threshold` for proactive cost alerts
- Budget hierarchy: Session → Phase → Task → Revision
- Partial work recovery for interrupted tasks (lockfile mechanism)
- Budget check integration with existing `onAgentProgress()` callback

#### Changed
- Cost control now operates at three levels (task, phase, session)
- Running tasks can exceed phase cap by `phase_budget_overflow` percentage
- Session cap is a hard stop with no overflow

### v1.1 (February 2026)

#### Added
- Full code execution loop with annotated TypeScript
- Core execution loop (`runPhase()`) for sequential and parallel modes
- Single task execution (`executeTask()`) with all safeguards
- Progress callback (`onAgentProgress()`) for cost monitoring
- Terminal summary (`printPhaseSummary()`) for overnight runs
- Error classification system (`classifyError()`)
- Retry/fallback decision logic (`shouldRetry()`)
- PRD-to-task YAML worked example
- File-overlap detection for parallel safety
- Pre-PR checks (rebase, build, caution files, cost)
- Post-merge integration check with rollback

#### Changed
- Safeguard execution points now clearly documented
- Error types mapped to specific actions (retry, fallback, abort)

### v1.0 (February 2026)

#### Added
- Initial architecture specification
- Ring-based build plan (Ring 0-5)
- Compound learning system (Layer 1 + Layer 2)
- GitHub Projects integration design
- PRD interview protocol
- Cost control system
- Agent sandbox specification
