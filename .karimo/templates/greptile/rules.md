# KARIMO Code Review Rules

<!-- GENERIC_TEMPLATE: Add your project-specific rules below -->
<!-- Run /karimo:configure --greptile to generate project-specific rules -->

## Required Checks

- All imports must be used (no dead imports)
- Type safety: no `any` types without explicit justification
- Consistent code style with existing codebase patterns

## Security

- No hardcoded secrets or API keys
- Validate all user inputs
- Use parameterized queries for database access

## Performance

- No N+1 query patterns
- Lazy load heavy components when possible

## KARIMO-Specific

- Task branches may have partial code; flag only issues within task scope
- Reference design system tokens, not hardcoded colors
