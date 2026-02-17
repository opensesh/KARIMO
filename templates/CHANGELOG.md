# Templates Changelog

All notable changes to KARIMO templates will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_No unreleased changes._

---

## [1.2.0] - 2026-02-17

### Changed
- `INTERVIEW_PROTOCOL.md`: Added round-to-section mapping and context handling documentation

---

## [1.1.0] - 2026-02-17

### Changed
- `PRD_TEMPLATE.md`: Renamed "ring" terminology to "level" for consistency
- `config.example.yaml`: Renamed "ring" terminology to "level" for consistency
- `config.example.yaml`: Updated with tiered command requirements (required vs recommended)
- `config.example.yaml`: Added auto-detection annotations and guidance

---

## [1.0.0] - 2026-02-17

### Added
- `config.example.yaml`: Configuration reference with all KARIMO settings
  - Project metadata (name, language, framework)
  - Command definitions (build, lint, test, typecheck)
  - Agent engine configuration
  - Cost control parameters
  - Safeguard boundaries (never_touch, require_review)
  - Sandbox environment variables
  - GitHub integration settings
- `PRD_TEMPLATE.md`: Product Requirements Document template
  - Task definition structure with YAML front matter
  - Complexity scoring guidelines
  - Dependency declaration format
  - File scope specification
- `INTERVIEW_PROTOCOL.md`: PRD interview protocol
  - Structured interview rounds
  - Question templates for requirements gathering
  - Task decomposition guidance

---

## Template Files

| File | Purpose |
|------|---------|
| `config.example.yaml` | Reference configuration for `.karimo/config.yaml` |
| `PRD_TEMPLATE.md` | Template for phase PRD documents |
| `INTERVIEW_PROTOCOL.md` | Protocol for conducting PRD interviews |
