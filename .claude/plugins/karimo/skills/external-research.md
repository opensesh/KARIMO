# Skill: KARIMO External Research

## Purpose

This skill provides strategies for conducting external research using web search, documentation, and MCP tools (when available).

**Applies to:** karimo-researcher, karimo-refiner agents

## Web Search Strategies

### Query Formulation

**Best Practice Queries:**

```
# General best practices
"{technology} {feature} best practices 2026"
"React file upload best practices 2026"
"Next.js authentication best practices 2026"

# Current year emphasis
"{topic} 2026"  # Prioritizes recent content
"{topic} latest"  # May return older "latest" guides
```

**Library Comparison Queries:**

```
# Direct comparison
"{library1} vs {library2}"
"react-dropzone vs react-file-drop"
"Redux vs Zustand vs Jotai"

# With year for current state
"{library1} vs {library2} 2026"

# For recommendations
"best {category} library 2026"
"best React state management library 2026"
```

**Implementation Pattern Queries:**

```
# Specific pattern
"{framework} {pattern} implementation"
"Next.js middleware authentication implementation"
"React error boundary implementation"

# With use case
"how to {task} in {framework}"
"how to handle file uploads in Next.js"
```

**Security & Performance Queries:**

```
# Security
"{feature} security best practices"
"file upload security vulnerabilities"
"authentication security checklist"

# Performance
"{feature} performance optimization"
"React form validation performance"
"image upload optimization techniques"
```

### Source Evaluation

**Trusted Sources (High Priority):**

- **Official Documentation**
  - React docs (react.dev)
  - Next.js docs (nextjs.org)
  - Framework/library official sites
  - MDN (developer.mozilla.org)

- **Established Technical Blogs**
  - LogRocket Blog
  - Smashing Magazine
  - CSS-Tricks
  - web.dev (Google)

- **Library Documentation**
  - npm package README
  - Official library documentation sites
  - GitHub repositories (README, docs folder)

**Secondary Sources (Use with Validation):**

- **Developer Platforms**
  - Stack Overflow (for specific issues, not general guidance)
  - Dev.to (check author credibility)
  - Medium (varies in quality)

- **GitHub Discussions**
  - Issue discussions in popular repositories
  - RFC documents
  - Changelog notes

**Avoid or Use Cautiously:**

- Tutorial sites with outdated content (check publication date)
- Personal blogs without credentials
- Content farms (low-quality aggregation sites)
- AI-generated content without human review

### Information Extraction

**What to Extract:**

1. **Recommended Approaches**
   - Current consensus (what's widely accepted)
   - Framework-specific recommendations
   - When to use pattern X vs. pattern Y

2. **Library Recommendations**
   - Official recommendations from framework docs
   - Community consensus from multiple sources
   - Comparison of alternatives

3. **Implementation Examples**
   - Minimal working examples
   - Official code snippets
   - Common patterns and idioms

4. **Gotchas and Caveats**
   - Common pitfalls to avoid
   - Edge cases and limitations
   - Breaking changes in recent versions

**How to Extract (Copyright Compliant):**

✓ **Paraphrase:** Rewrite in your own words
✓ **Synthesize:** Combine information from multiple sources
✓ **Summarize:** Distill key points concisely
✓ **Link:** Provide source URL instead of reproducing content

❌ **Don't reproduce:** No large blocks of text (>20 words)
❌ **Don't quote extensively:** Maximum ONE quote per source, <15 words
❌ **Don't copy examples wholesale:** Reference or paraphrase

**Example:**

❌ **Bad (reproduces content):**
```
According to the React docs: "Error boundaries are React components that catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of the component tree that crashed. Error boundaries catch errors during rendering, in lifecycle methods, and in constructors of the whole tree below them."
```

✓ **Good (paraphrased and cited):**
```
Error boundaries handle errors in child components during rendering and lifecycle methods. They display fallback UI instead of crashing the whole app. Source: [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
```

## Documentation Scraping

### Official Documentation

**Approach:**

1. **Locate Relevant Section**
   - Use site search or table of contents
   - Look for: Getting Started, Guides, API Reference, Best Practices

2. **Extract Key Information**
   - Recommended patterns and practices
   - Configuration options
   - Common use cases and examples
   - Caveats and limitations

3. **Capture Examples**
   - Minimal working examples
   - Official code patterns
   - Note: Link to example rather than reproducing full code

4. **Attribute Source**
   - Document URL
   - Section/page title
   - Date accessed (for documentation versioning)

**Example Output:**

```markdown
### Best Practice: Authentication Middleware

**Source:** [Next.js Middleware Docs](https://nextjs.org/docs/app/building-your-application/routing/middleware)

**Pattern:** Use middleware for route protection
- Middleware runs before route handlers
- Check authentication in middleware.ts
- Redirect to login if unauthenticated

**Example:** See official guide at {URL}

**Caveats:**
- Middleware runs on Edge Runtime (limited Node.js APIs)
- Cannot use all npm packages in middleware
```

### Library Documentation

**Evaluation Checklist:**

- [ ] README quality (clear, comprehensive?)
- [ ] Installation instructions
- [ ] Basic usage examples
- [ ] API reference (complete?)
- [ ] TypeScript support (types included?)
- [ ] Migration guides (if updating from old version)

**Extract:**

```markdown
### Library: {name} ({npm-package})

**Purpose:** {What it does}
**Installation:** `npm install {package}`
**TypeScript:** {Built-in | @types/package | None}

**Basic Usage:** {Link to docs example}

**Configuration:** {Key config options}

**Pros:**
- {Advantage from docs}

**Cons:**
- {Limitation noted in docs}

**Documentation:** {URL}
```

## Firecrawl (Recommended)

Firecrawl is the **recommended tool** for external research when available. It provides deep documentation scraping, library evaluation, and multi-page research capabilities.

**Full Reference:** See `.claude/skills/karimo/firecrawl-web-tools.md` for:
- Complete 12-tool decision tree
- Escalation ladder (scrape → waitFor → map → browser → agent)
- Detailed tool reference with JSON examples
- KARIMO-specific patterns for research workflows

### Quick Reference

| Need | Tool |
|------|------|
| Read documentation page | `firecrawl_scrape` with `formats: ["markdown"]` |
| Extract library metadata | `firecrawl_scrape` with `formats: ["json"]` |
| Compare multiple packages | `firecrawl_extract` with schema |
| Find docs pages | `firecrawl_map` with `search` |
| Web search | `firecrawl_search` |

### Fallback (When Firecrawl Not Available)

If Firecrawl MCP is not configured, fall back to:
- `WebSearch` — Basic web search for best practices
- `WebFetch` — Single page fetch with AI processing

**Note:** These fallback tools have limitations compared to Firecrawl:
- No structured extraction (JSON schemas)
- No multi-page operations
- No caching or proxy support

### Browser Automation

**Use Case:** Interactive documentation, login-gated content

**When to Use:**
- Documentation has interactive examples
- Need to explore framework playgrounds
- Content behind login walls

If browser automation (Claude in Chrome or Firecrawl browser tools) is available:
- Navigate to interactive docs/playgrounds
- Interact with examples to understand behavior
- Extract code from live examples
- Screenshot interesting patterns

See `.claude/skills/karimo/firecrawl-web-tools.md` for browser tool details.

## Source Attribution

### Required Information

**For Every External Finding:**

- **Source URL:** Full URL to original content
- **Title:** Page or article title
- **Date:** Publication date or date accessed
- **Author:** If individual author (optional for official docs)
- **Relevance:** How it applies to PRD/task

### Attribution Format

**In Research Artifacts:**

```markdown
### Finding: {Title}

**Source:** [{Page Title}]({URL}) ({Year})
**Author:** {Author name if applicable}
**Accessed:** {YYYY-MM-DD}

**Summary:** {Paraphrased information}

**Key Points:**
- Point 1 (paraphrased)
- Point 2 (paraphrased)

**Quote:** "{Short relevant quote if absolutely necessary}" [1]

[1]: {Source URL}
```

**In sources.yaml:**

```yaml
sources:
  - url: "https://react.dev/reference/react/Component"
    title: "React Component API Reference"
    type: official_docs
    accessed: "2026-03-11"
    relevance: "Error boundary implementation for Task 1a"

  - url: "https://www.logrocket.com/blog/react-error-handling/"
    title: "Complete Guide to React Error Handling"
    type: blog
    author: "LogRocket"
    published: "2025-11-20"
    accessed: "2026-03-11"
    relevance: "Error boundary best practices and patterns"
```

## Quality Control

### Validation Checklist

Before including external research in findings:

- [ ] Information is current (2024-2026 preferred)
- [ ] Source is trustworthy (official docs, established blogs)
- [ ] Information validated across multiple sources (if critical)
- [ ] Paraphrased appropriately (not copied)
- [ ] Source attributed correctly
- [ ] Relevance to PRD/task is clear
- [ ] Actionable recommendations provided

### Multi-Source Validation

**For Critical Decisions:**

1. **Check Official Docs** (primary source of truth)
2. **Validate with 2-3 Secondary Sources** (blogs, tutorials)
3. **Note Consensus** (what multiple sources agree on)
4. **Flag Conflicts** (if sources disagree, document both sides)

**Example:**

```markdown
### State Management Recommendation

**Consensus (3/3 sources):**
- Zustand for simple state
- Redux Toolkit for complex state
- React Context for theme/auth

**Official Stance:**
- [React Docs](URL): "Context for rarely changing data"
- [Zustand Docs](URL): "Minimal boilerplate, TypeScript-friendly"
- [Redux Toolkit Docs](URL): "Best for complex app state"

**Conflict Noted:**
- Some sources recommend React Query for server state
- Others prefer traditional state management
- **Recommendation:** React Query for server state, Zustand for client state (separation of concerns)
```

## Copyright Compliance Checklist

Before finalizing external research:

- [ ] No large text blocks reproduced (>20 words)
- [ ] Maximum ONE quote per source, <15 words
- [ ] All quotes in quotation marks with attribution
- [ ] Information paraphrased and synthesized
- [ ] Sources linked instead of content reproduced
- [ ] Code examples referenced with links, not copied wholesale
- [ ] Song lyrics NEVER reproduced (hard ban)

## Research Time Guidelines

**Per External Research Topic:**

- Web search: 5-10 minutes
- Documentation reading: 10-15 minutes
- Library evaluation: 5-10 minutes
- Source attribution: 5 minutes
- Synthesis and writing: 10-15 minutes

**Total: 35-55 minutes per topic**

**For Full PRD External Research:**

- 3-5 topics typical (authentication, forms, file upload, etc.)
- **Total: 105-275 minutes (1.5-4.5 hours)**

**Optimization:**

- Prioritize most critical topics
- Use MCP tools for efficiency (if available)
- Validate only critical decisions across multiple sources
- Focus on actionable recommendations over exhaustive research

## Related Files

- Agent: `.claude/agents/karimo/researcher.md`
- Skill: `.claude/skills/karimo/research-methods.md`
- Templates: `.karimo/templates/GENERAL_RESEARCH_TEMPLATE.md`
- Guide: `.karimo/docs/RESEARCH.md`
