# Changelog

All notable changes to KARIMO documentation and templates will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Workflows**: Add karimo-integration GitHub Action for automated PR checks
- **GitHub**: Add issue template for KARIMO automated task creation
- **Skills**: Add git-worktree-ops skill documenting worktree management patterns
- **Commands**: Add `/karimo:execute` slash command for autonomous PRD execution
- **Templates**: Add v2 templates for PRD, interview protocol, and task schema
- **Agents**: Add karimo-investigator agent for codebase scanning and file analysis
- **Commands**: Add `/karimo:plan` slash command for PRD interview orchestration
- **CLI**: Export input-sanitizer, boundaries-display, and response-formatter modules from UI barrel
- **Interview**: Integrate input sanitization and response formatting in conversation loops
- **CLI**: Add response formatter for highlighting questions and bold text in agent output
- **CLI**: Update collapsible response to accept ProcessedInput for sanitized display
- **CLI**: Add input sanitizer for safe terminal display of numbered and bulleted text
- **CLI**: Export collapsible response renderer and keypress manager from UI module
- **CLI**: Add keypress manager for Ctrl+O toggle handling with safe raw mode lifecycle
- **CLI**: Add reconfigure action to returning welcome for config updates
- **CLI**: Add info command and integrate returning welcome flow for non-first-time users
- **CLI**: Add returning user welcome orchestrator with session info and action selection
- **CLI**: Add compact 3-line ASCII wordmark banner for returning users
- **Text Formatting Utilities**: ANSI-aware text wrapping for terminal output with streaming support, preventing mid-word breaks during agent responses
- **Long Input Handler**: Editor fallback (`/edit` command) for composing long responses using $EDITOR
- **Conversational Interview System**: Free-form interview replacing rigid 5-round structure with progress tracking and conflict detection
- **Streaming Tool APIs**: Real-time streaming with tool use support via `streamMessageWithTools` and `streamContinueWithToolResults`
- **Intake Agent**: Context analysis and structure extraction for open-ended interview initialization
- **Animated Welcome Screen**: Section-by-section reveal animation for first-run experience with ASCII wordmark, orchestration flow diagram, level-based build plan, and getting started guidance
- **Init → PRD Transition**: Seamless flow from config initialization to PRD interview in the same terminal session
- **Section Explanations**: Context notes explaining what KARIMO does with each config section (commands, rules, sandbox, boundaries)
- **Boundaries Source Attribution**: Display where boundary patterns were detected from during init
- **Checkpoint Command Stub**: Placeholder for Level 2 learning checkpoints with guidance to use `karimo note`

### Changed
- **runInit() Return Type**: Now returns `InitResult` instead of calling `process.exit()`, enabling composable CLI flows
- **Doctor Checklist**: Added context explanation and GitHub issues link for getting help
- **Husky commit-msg Hook**: Auto-generates CHANGELOG entries for `feat:`/`fix:` commits using Claude Code instead of blocking

### Fixed
- **CLI**: Show returning welcome when running `karimo init` with existing config instead of immediately asking to overwrite

---

## [0.1.0] - 2026-02-17

### Added
- **Workflows**: Add karimo-integration GitHub Action for automated PR checks
- **GitHub**: Add issue template for KARIMO automated task creation
- **Skills**: Add git-worktree-ops skill documenting worktree management patterns
- **Commands**: Add `/karimo:execute` slash command for autonomous PRD execution
- **Templates**: Add v2 templates for PRD, interview protocol, and task schema
- **Agents**: Add karimo-investigator agent for codebase scanning and file analysis
- **Commands**: Add `/karimo:plan` slash command for PRD interview orchestration
- **CLI**: Export input-sanitizer, boundaries-display, and response-formatter modules from UI barrel
- **Interview**: Integrate input sanitization and response formatting in conversation loops
- **CLI**: Add response formatter for highlighting questions and bold text in agent output
- **CLI**: Update collapsible response to accept ProcessedInput for sanitized display
- **CLI**: Add input sanitizer for safe terminal display of numbered and bulleted text
- **CLI**: Export collapsible response renderer and keypress manager from UI module
- **CLI**: Add keypress manager for Ctrl+O toggle handling with safe raw mode lifecycle
- **CLI**: Add reconfigure action to returning welcome for config updates
- **CLI**: Add info command and integrate returning welcome flow for non-first-time users
- **CLI**: Add returning user welcome orchestrator with session info and action selection
- **CLI**: Add compact 3-line ASCII wordmark banner for returning users
- **Agent Teams (Phase 9)**: Parallel task execution with PMAgent coordination, file-based queue, findings propagation
- **Interview Subagents (Phase 8)**: Focused subagent spawning for clarification, research, scope validation, and review tasks
- **Structured Output**: Zod schema validation for agent outputs with JSON Schema conversion
- **Extended Thinking**: Auto-enable extended thinking based on task complexity signals
- **Doctor Command**: Health checks for runtime, config, git, and GitHub authentication
- **First-Run Flow**: Welcome screen with ASCII wordmark and guided onboarding
- **Telemetry Module**: Dogfooding event tracking for CLI usage
- **Safety Check**: Working directory validation to prevent running outside KARIMO projects
- **Note Command**: Quick feedback capture during dogfooding
- **Reset Command**: Clear KARIMO state and cached data
- **Husky Pre-Push Hook**: Changelog reminder warnings for versioning discipline

### Fixed
- **CLI**: Fix LoadConfigResult property access and import formatting in session info
- CLI dev script pointing to correct entry point
- Team queue file lock and version conflict issues
- Safety check detection for @karimo/core
- TypeScript and lint issues in new modules

### Documentation
- Agent capabilities by level summary
- Component specs for thinking, structured output, subagents, and teams
- Architecture enhancements section
- Extended thinking, structured output, subagents, and team modules in CLAUDE.md

---

## [1.4.0] - 2026-02-17

### Added
- **Workflows**: Add karimo-integration GitHub Action for automated PR checks
- **GitHub**: Add issue template for KARIMO automated task creation
- **Skills**: Add git-worktree-ops skill documenting worktree management patterns
- **Commands**: Add `/karimo:execute` slash command for autonomous PRD execution
- **Templates**: Add v2 templates for PRD, interview protocol, and task schema
- **Agents**: Add karimo-investigator agent for codebase scanning and file analysis
- **Commands**: Add `/karimo:plan` slash command for PRD interview orchestration
- **CLI**: Export input-sanitizer, boundaries-display, and response-formatter modules from UI barrel
- **Interview**: Integrate input sanitization and response formatting in conversation loops
- **CLI**: Add response formatter for highlighting questions and bold text in agent output
- **CLI**: Update collapsible response to accept ProcessedInput for sanitized display
- **CLI**: Add input sanitizer for safe terminal display of numbered and bulleted text
- **CLI**: Export collapsible response renderer and keypress manager from UI module
- **CLI**: Add keypress manager for Ctrl+O toggle handling with safe raw mode lifecycle
- **CLI**: Add reconfigure action to returning welcome for config updates
- **CLI**: Add info command and integrate returning welcome flow for non-first-time users
- **CLI**: Add returning user welcome orchestrator with session info and action selection
- **CLI**: Add compact 3-line ASCII wordmark banner for returning users
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
- **Workflows**: Add karimo-integration GitHub Action for automated PR checks
- **GitHub**: Add issue template for KARIMO automated task creation
- **Skills**: Add git-worktree-ops skill documenting worktree management patterns
- **Commands**: Add `/karimo:execute` slash command for autonomous PRD execution
- **Templates**: Add v2 templates for PRD, interview protocol, and task schema
- **Agents**: Add karimo-investigator agent for codebase scanning and file analysis
- **Commands**: Add `/karimo:plan` slash command for PRD interview orchestration
- **CLI**: Export input-sanitizer, boundaries-display, and response-formatter modules from UI barrel
- **Interview**: Integrate input sanitization and response formatting in conversation loops
- **CLI**: Add response formatter for highlighting questions and bold text in agent output
- **CLI**: Update collapsible response to accept ProcessedInput for sanitized display
- **CLI**: Add input sanitizer for safe terminal display of numbered and bulleted text
- **CLI**: Export collapsible response renderer and keypress manager from UI module
- **CLI**: Add keypress manager for Ctrl+O toggle handling with safe raw mode lifecycle
- **CLI**: Add reconfigure action to returning welcome for config updates
- **CLI**: Add info command and integrate returning welcome flow for non-first-time users
- **CLI**: Add returning user welcome orchestrator with session info and action selection
- **CLI**: Add compact 3-line ASCII wordmark banner for returning users
- **docs/DASHBOARD.md**: Dashboard documentation for Level 5
- **docs/DEPENDENCIES.md**: Dependency inventory and portability guide
- **docs/COMPONENTS.md**: Comprehensive component specifications
- **docs/LEVELS.md**: Updated with detailed timelines and exit criteria
- **docs/ARCHITECTURE.md**: Risk Mitigation and Key Principles sections

---

## [1.0.0] - 2026-02-17

### Added
- **Workflows**: Add karimo-integration GitHub Action for automated PR checks
- **GitHub**: Add issue template for KARIMO automated task creation
- **Skills**: Add git-worktree-ops skill documenting worktree management patterns
- **Commands**: Add `/karimo:execute` slash command for autonomous PRD execution
- **Templates**: Add v2 templates for PRD, interview protocol, and task schema
- **Agents**: Add karimo-investigator agent for codebase scanning and file analysis
- **Commands**: Add `/karimo:plan` slash command for PRD interview orchestration
- **CLI**: Export input-sanitizer, boundaries-display, and response-formatter modules from UI barrel
- **Interview**: Integrate input sanitization and response formatting in conversation loops
- **CLI**: Add response formatter for highlighting questions and bold text in agent output
- **CLI**: Update collapsible response to accept ProcessedInput for sanitized display
- **CLI**: Add input sanitizer for safe terminal display of numbered and bulleted text
- **CLI**: Export collapsible response renderer and keypress manager from UI module
- **CLI**: Add keypress manager for Ctrl+O toggle handling with safe raw mode lifecycle
- **CLI**: Add reconfigure action to returning welcome for config updates
- **CLI**: Add info command and integrate returning welcome flow for non-first-time users
- **CLI**: Add returning user welcome orchestrator with session info and action selection
- **CLI**: Add compact 3-line ASCII wordmark banner for returning users
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
