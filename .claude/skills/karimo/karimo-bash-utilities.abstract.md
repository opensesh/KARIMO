# karimo-bash-utilities

**Type:** Skill
**Applies to:** All KARIMO agents

## Purpose

Reusable bash patterns and helper functions for KARIMO agents. Avoids external dependencies like jq.

## Key Capabilities

- YAML configuration parsing (parse_yaml_field)
- JSON status file operations (read_status_field, read_task_field)
- GitHub Project status updates (update_project_status)
- Validation helpers (check_config_exists, check_prd_exists)
- Time utilities (time_ago, is_stale)

## Usage

Agents source these patterns for consistent config access and status updates.

---
*Full definition: `.claude/skills/karimo/karimo-bash-utilities.md` (488 lines)*
