# Changelog

All notable changes to KARIMO documentation and templates will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_No unreleased changes._

---

## [1.4.0] - 2026-02-17

### Added
- **docs/CODE-INTEGRITY.md**: Greptile section explaining automated review integration

---

## [1.3.0] - 2026-02-17

### Changed
- **templates/INTERVIEW_PROTOCOL.md**: Added round-to-section mapping and context handling

---

## [1.2.0] - 2026-02-17

### Changed
- **templates/PRD_TEMPLATE.md**: Renamed "ring" → "level" terminology
- **templates/config.example.yaml**: Renamed "ring" → "level", tiered command requirements, auto-detection annotations

---

## [1.1.0] - 2026-02-17

### Added
- **docs/DASHBOARD.md**: Dashboard documentation for Level 5
- **docs/DEPENDENCIES.md**: Dependency inventory and portability guide
- **docs/COMPONENTS.md**: Comprehensive component specifications
- **docs/LEVELS.md**: Updated with detailed timelines and exit criteria
- **docs/ARCHITECTURE.md**: Risk Mitigation and Key Principles sections

---

## [1.0.0] - 2026-02-17

### Added
- **templates/config.example.yaml**: Configuration reference for `.karimo/config.yaml`
  - Project metadata (name, language, framework)
  - Command definitions (build, lint, test, typecheck)
  - Agent engine configuration
  - Cost control parameters
  - Safeguard boundaries (never_touch, require_review)
  - Sandbox environment variables
  - GitHub integration settings
- **templates/PRD_TEMPLATE.md**: PRD template with YAML task blocks
  - Task definition structure with YAML front matter
  - Complexity scoring guidelines
  - Dependency declaration format
  - File scope specification
- **templates/INTERVIEW_PROTOCOL.md**: PRD interview protocol
  - Structured interview rounds
  - Question templates for requirements gathering
  - Task decomposition guidance
- **docs/**: Initial documentation structure
  - ARCHITECTURE.md — System architecture and design
  - LEVELS.md — Level-based build plan (0-5)
  - COMPONENTS.md — Module specifications
  - CODE-INTEGRITY.md — Code quality standards
  - SECURITY.md — Security model and sandboxing
  - COMPOUND-LEARNING.md — Learning system design
  - CONTRIBUTING.md — Contribution guidelines
