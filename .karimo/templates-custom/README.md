# Custom Template Overrides

This directory allows you to override KARIMO's core templates with your own custom versions.

## How It Works

KARIMO uses a **template resolution priority system**:

1. **Check `.karimo/templates-custom/{template}`** first (this directory)
2. **Fall back to `.karimo/templates/{template}`** if not found (core templates)

This means you can selectively override only the templates you want to customize, while keeping others as defaults.

---

## Available Templates for Override

You can override any of these core templates:

| Template | Purpose | Override Impact |
|----------|---------|-----------------|
| `PRD_TEMPLATE.md` | PRD structure | Changes PRD format for all new PRDs |
| `INTERVIEW_PROTOCOL.md` | Interview questions | Customizes interview flow and questions |
| `TASK_SCHEMA.md` | Task YAML structure | Changes task definition format |
| `TASK_BRIEF_TEMPLATE.md` | Task brief format | Customizes what agents see in briefs |
| `STATUS_SCHEMA.md` | Execution tracking | Changes status.json structure |
| `EXECUTION_PLAN_SCHEMA.md` | Wave planning | Customizes execution plan format |
| `DEPENDENCIES_TEMPLATE.md` | Dependency graph | Changes dependency visualization |
| `METRICS_SCHEMA.md` | Analytics data | Customizes metrics tracking |
| `FEEDBACK_DOCUMENT_TEMPLATE.md` | Feedback structure | Changes feedback document format |
| `FEEDBACK_INTERVIEW_PROTOCOL.md` | Feedback questions | Customizes feedback interview |
| `PRE_EXECUTION_REVIEW_TEMPLATE.md` | Review findings | Changes review output format |
| `REVIEW_TEMPLATE.md` | Code review guidelines | Customizes REVIEW.md for Code Review |

---

## Creating a Custom Template

### Step 1: Copy Core Template

Copy the template you want to customize:

```bash
# Example: Customize PRD template
cp .karimo/templates/PRD_TEMPLATE.md .karimo/templates-custom/PRD_TEMPLATE.md
```

### Step 2: Edit Your Copy

Edit the copied file in `.karimo/templates-custom/` with your changes:

```bash
# Edit with your preferred editor
vim .karimo/templates-custom/PRD_TEMPLATE.md
```

### Step 3: Test

Create a new PRD to see your custom template in action:

```bash
/karimo:plan
# Your custom PRD template will be used
```

---

## Example: Custom PRD Template

**Scenario:** You want to add a "Business Impact" section to all PRDs.

**Step 1: Copy template**
```bash
cp .karimo/templates/PRD_TEMPLATE.md .karimo/templates-custom/PRD_TEMPLATE.md
```

**Step 2: Edit to add section**
```markdown
# PRD: {Feature Name}

## Overview
...

## Business Impact (CUSTOM SECTION)
- Revenue impact:
- User acquisition:
- Competitive advantage:

## Technical Approach
...
```

**Step 3: New PRDs use your template**
All future PRDs created with `/karimo:plan` will include the Business Impact section.

---

## Example: Custom Interview Protocol

**Scenario:** You want to add a question about security considerations.

**Step 1: Copy protocol**
```bash
cp .karimo/templates/INTERVIEW_PROTOCOL.md .karimo/templates-custom/INTERVIEW_PROTOCOL.md
```

**Step 2: Add your question**
```markdown
## Round 4: Security & Compliance

Ask the user:

**Question 1: Security Requirements**
"Does this feature handle sensitive data or require special security considerations?"

Options:
- Yes (ask for details)
- No
- Unsure

If Yes: "What type of sensitive data? (PII, financial, health, etc.)"
```

**Step 3: Interview includes your question**
The interviewer agent will now ask your custom security question in every PRD interview.

---

## Best Practices

### 1. Start Small
- Override one template at a time
- Test thoroughly before committing to repository
- Document why you made the change

### 2. Keep Structure Similar
- Maintain the same heading hierarchy
- Preserve required fields (agents expect these)
- Add sections, don't remove core ones

### 3. Version Control
- Commit custom templates to your repository
- Document changes in CLAUDE.md or README
- Review during team onboarding

### 4. Update During KARIMO Updates
- When KARIMO updates, check if core templates changed
- Merge improvements into your custom templates
- Test after updates to ensure compatibility

---

## Resetting to Defaults

To stop using a custom template, simply delete it:

```bash
# Remove custom PRD template
rm .karimo/templates-custom/PRD_TEMPLATE.md

# KARIMO will fall back to core template
/karimo:plan  # Uses default PRD_TEMPLATE.md
```

---

## Validation

KARIMO does NOT validate custom templates. You are responsible for ensuring:

- Valid markdown syntax
- Required fields are present
- Agents can parse the structure
- No breaking changes to schemas

**Tip:** Test with a small PRD before rolling out to production.

---

## Troubleshooting

### Custom template not being used

**Check:**
1. File is in `.karimo/templates-custom/` (not `templates/`)
2. Filename matches exactly (case-sensitive)
3. No typos in filename
4. Template is valid markdown

**Verify resolution:**
```bash
# Check which template would be used
ls -la .karimo/templates-custom/PRD_TEMPLATE.md
ls -la .karimo/templates/PRD_TEMPLATE.md
# Custom takes priority if exists
```

### Agent errors after custom template

**Causes:**
- Missing required sections
- Invalid YAML structure (for schema templates)
- Incompatible format changes

**Fix:**
1. Restore core template temporarily
2. Compare your changes
3. Identify required vs optional sections
4. Re-add required sections to custom template

---

## Advanced: Creating New Templates

You can also create entirely NEW templates (not just overrides):

```bash
# Create a new template for your custom workflow
cat > .karimo/templates-custom/CUSTOM_WORKFLOW.md << 'EOF'
# Custom Workflow Template

Your custom template content here...
EOF
```

**Note:** Agents won't automatically use new templates. You'll need to reference them explicitly or modify agent prompts.

---

## Related Documentation

- [ARCHITECTURE.md](../docs/ARCHITECTURE.md) — How templates fit into KARIMO
- [COMMANDS.md](../docs/COMMANDS.md) — Commands that use templates
- [GETTING-STARTED.md](../docs/GETTING-STARTED.md) — Template usage in workflows

---

## Support

- Issues with custom templates: Check TROUBLESHOOTING.md
- Questions about template structure: Review core templates in `.karimo/templates/`
- Template enhancement ideas: Submit GitHub issue or discussion

---

*Custom template system added in KARIMO v6.0*
