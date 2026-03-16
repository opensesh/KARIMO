# Skill: Firecrawl Web Tools

Provides web scraping, search, screenshots, PDF-to-markdown conversion, brand extraction, site crawling, and browser automation via the Firecrawl MCP server.

**Auto-activates when:** Research requires external documentation scraping, library evaluation, or multi-page documentation analysis.

**Applies to:** karimo-researcher, karimo-refiner agents

---

## Tool Decision Tree

Pick the right tool for the job:

| Need | Tool | Key Args |
|------|------|----------|
| Read a single page | `firecrawl_scrape` | `formats: ["markdown"], onlyMainContent: true` |
| Extract specific data points | `firecrawl_scrape` | `formats: ["json"], jsonOptions: { prompt, schema }` |
| Extract same fields from many URLs | `firecrawl_extract` | `urls: [...], prompt, schema` |
| Take a screenshot | `firecrawl_scrape` | `formats: ["screenshot"], screenshotOptions` |
| Convert PDF to markdown | `firecrawl_scrape` | `parsers: ["pdf"], pdfOptions: { maxPages }` |
| Search the web | `firecrawl_search` | `query, limit, sources` |
| Find pages on a site | `firecrawl_map` | `url, search: "keyword"` |
| Scrape multiple pages | `firecrawl_map` then `firecrawl_scrape` each | Map first, scrape relevant results |
| Crawl entire site section | `firecrawl_crawl` | `url, limit, maxDiscoveryDepth` (async) |
| Extract brand identity | `firecrawl_scrape` | `formats: ["branding"]` |
| Interact with JS-heavy / login-gated site | `firecrawl_browser_*` | Create session, execute commands |
| Complex multi-source research | `firecrawl_agent` | `prompt, schema` (async, 2-5 min) |

### Escalation Ladder

When a simple approach fails, escalate in this order:

```
scrape → scrape + waitFor → map + scrape → browser tools → agent
```

**When to escalate:**
1. **scrape** returns empty/minimal content → try `waitFor: 5000` for JS rendering
2. **scrape + waitFor** still fails → use `map` to find correct URL, then scrape
3. **map + scrape** fails (login required, complex interactions) → use browser tools
4. **browser tools** too complex → use agent for autonomous research

---

## Tool Reference

### 1. `firecrawl_scrape` — Single Page Extraction

The workhorse tool. Supports multiple output formats.

**Read a page as markdown:**
```json
{
  "url": "https://example.com/docs/api",
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

**Extract specific data as structured JSON** (use this instead of markdown when you need specific fields):
```json
{
  "url": "https://example.com/pricing",
  "formats": ["json"],
  "jsonOptions": {
    "prompt": "Extract all pricing tiers with name, price, and features",
    "schema": {
      "type": "object",
      "properties": {
        "tiers": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "price": { "type": "string" },
              "features": { "type": "array", "items": { "type": "string" } }
            }
          }
        }
      }
    }
  }
}
```

**Take a screenshot:**
```json
{
  "url": "https://example.com",
  "formats": ["screenshot"],
  "screenshotOptions": {
    "fullPage": true,
    "quality": 80,
    "viewport": { "width": 1280, "height": 720 }
  }
}
```

**Convert PDF to markdown:**
```json
{
  "url": "https://example.com/report.pdf",
  "parsers": ["pdf"],
  "pdfOptions": { "maxPages": 50 }
}
```

**Key parameters:**
- `onlyMainContent: true` — Strip nav, footer, ads (use for markdown)
- `waitFor: 5000` — Wait ms for JS to render before extracting
- `maxAge: 86400` — Use cached version if scraped within N seconds (500% faster)
- `proxy: "stealth"` — Options: `"basic"`, `"stealth"`, `"enhanced"`, `"auto"` for blocked sites
- `mobile: true` — Render as mobile device
- `actions` — Pre-scrape interactions: `click`, `scroll`, `wait`, `write`, `press`, `executeJavascript`, `screenshot`, `generatePDF`
- `location: { country: "us", languages: ["en"] }` — Geo-targeted scraping
- `excludeTags` / `includeTags` — Filter HTML elements

---

### 2. `firecrawl_search` — Web Search

Search the web with operators and optional inline content scraping.

**Basic search:**
```json
{
  "query": "React Server Components best practices 2026",
  "limit": 5,
  "sources": [{ "type": "web" }]
}
```

**Search with operators:**
```json
{
  "query": "site:react.dev \"error boundary\" -class",
  "limit": 5
}
```

**Search with inline scraping** (use sparingly, keep limit low):
```json
{
  "query": "Next.js 16 migration guide",
  "limit": 3,
  "scrapeOptions": {
    "formats": ["markdown"],
    "onlyMainContent": true
  }
}
```

**Available operators:** `""` (exact match), `-` (exclude), `site:`, `inurl:`, `intitle:`, `allintitle:`, `allinurl:`, `related:`

**Sources:** `web` (default), `images`, `news`

**Optimal workflow:** Search without `scrapeOptions` first, review results, then `firecrawl_scrape` the relevant pages individually.

---

### 3. `firecrawl_map` — URL Discovery

Fast URL discovery on a site. Use before scraping when you need to find the right page.

**Discover all URLs:**
```json
{
  "url": "https://docs.example.com"
}
```

**Search for specific pages:**
```json
{
  "url": "https://docs.example.com",
  "search": "authentication webhook",
  "limit": 20
}
```

**Key parameters:**
- `search` — Filter results by keyword (much faster than crawling)
- `limit` — Max URLs to return
- `includeSubdomains: true` — Include subdomains
- `ignoreQueryParameters: true` — Deduplicate URL variants
- `sitemap: "include" | "skip" | "only"` — Control sitemap usage

**When to use:** When `firecrawl_scrape` returns empty/minimal content (page is SPA or content is on a different URL), use `map` with `search` to find the correct page, then scrape it.

---

### 4. `firecrawl_extract` — Multi-URL Structured Extraction

LLM-powered extraction of the same data fields across multiple URLs at once.

```json
{
  "urls": [
    "https://example.com/product/1",
    "https://example.com/product/2",
    "https://example.com/product/3"
  ],
  "prompt": "Extract product details",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "price": { "type": "number" },
      "description": { "type": "string" }
    },
    "required": ["name", "price"]
  }
}
```

**Key parameters:**
- `enableWebSearch: true` — Let the LLM search for additional context
- `allowExternalLinks: true` — Follow links outside the domain
- `includeSubdomains: true` — Include subdomain pages

**Use over `firecrawl_scrape` + JSON when:** You have 3+ URLs and want the same fields from each.

---

### 5. `firecrawl_crawl` + `firecrawl_check_crawl_status` — Site Crawling

Async multi-page crawling. Returns a job ID — poll with `check_crawl_status`.

**Start a crawl:**
```json
{
  "url": "https://example.com/blog",
  "limit": 20,
  "maxDiscoveryDepth": 2,
  "deduplicateSimilarURLs": true,
  "scrapeOptions": {
    "formats": ["markdown"],
    "onlyMainContent": true
  }
}
```

**Check status:**
```json
{
  "id": "crawl-job-id-here"
}
```

**Key parameters:**
- `limit` — Max pages (keep low to avoid token overflow)
- `maxDiscoveryDepth` — How many link levels deep
- `includePaths` / `excludePaths` — Scope the crawl
- `deduplicateSimilarURLs: true` — Reduce noise

**Prefer `map` + `scrape` over `crawl`** for most multi-page needs. Crawl is better only when you need comprehensive coverage of an entire site section and don't know the URLs in advance.

---

### 6. `firecrawl_agent` + `firecrawl_agent_status` — Autonomous Research

An AI agent that independently browses, searches, and extracts data. Async — returns a job ID.

**Start research:**
```json
{
  "prompt": "Find the top 5 React component libraries in 2026, their GitHub stars, and key features",
  "schema": {
    "type": "object",
    "properties": {
      "libraries": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "stars": { "type": "number" },
            "features": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  }
}
```

**Poll for results** (every 15-30 seconds, wait 2-5 minutes):
```json
{
  "id": "agent-job-id-here"
}
```

**Statuses:** `processing` (keep polling), `completed` (results ready), `failed` (error)

**Use as last resort** after `map` + `scrape` fails. Agent is the most expensive and slowest tool.

---

### 7. Browser Tools — Interactive Automation

For JS-heavy SPAs, login-gated content, or multi-step interactions.

**Session lifecycle:** `browser_create` → `browser_execute` (repeat) → `browser_delete`

**Create a session:**
```json
{
  "profile": { "name": "my-session", "saveChanges": true },
  "ttl": 300
}
```

**Execute commands** (prefer bash with agent-browser):
```json
{
  "sessionId": "session-id",
  "code": "agent-browser open https://example.com",
  "language": "bash"
}
```

**Key agent-browser commands:**
- `agent-browser open <url>` — Navigate
- `agent-browser snapshot` — Get accessibility tree with clickable refs
- `agent-browser snapshot -i -c` — Interactive elements only, compact
- `agent-browser click @e5` — Click element by ref
- `agent-browser type @e3 "text"` — Type into element
- `agent-browser fill @e3 "text"` — Clear and fill
- `agent-browser get text @e1` — Get text content
- `agent-browser screenshot` — Capture page
- `agent-browser scroll down` — Scroll
- `agent-browser wait 2000` — Wait ms

**For Playwright scripting, use Python:**
```json
{
  "sessionId": "session-id",
  "code": "await page.goto('https://example.com')\ntitle = await page.title()\nprint(title)",
  "language": "python"
}
```

**Profile persistence:** Sessions with the same `profile.name` share cookies and localStorage.

---

## Best Practices

1. **Format selection:** Use `json` format with a schema when extracting specific data. Use `markdown` only when you need the full page content.
2. **Caching:** Set `maxAge` (seconds) for repeat scrapes — 500% faster from cache.
3. **Main content:** Always use `onlyMainContent: true` for markdown to strip nav/footer/ads.
4. **JS pages:** Try `waitFor: 5000` before escalating to browser tools.
5. **Multi-page:** Use `map` + `scrape` instead of `crawl` for better control and lower credit usage.
6. **Search workflow:** Search without `scrapeOptions` first, then scrape relevant results individually.
7. **Credit awareness:** Scrape and search are cheapest. Crawl and agent consume more credits.
8. **Proxies:** Use `proxy: "auto"` if a site blocks scraping. Escalate to `"stealth"` or `"enhanced"` if needed.

---

## KARIMO Research Patterns

### Library Documentation Scraping

When researching library recommendations for external research:

```json
// Step 1: Map the docs site to find relevant pages
{
  "url": "https://react-dropzone.js.org",
  "search": "getting started api reference",
  "limit": 10
}

// Step 2: Scrape specific pages
{
  "url": "https://react-dropzone.js.org/docs/getting-started",
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

### Best Practices Research

For researching current best practices:

```json
// Search for recent content
{
  "query": "React file upload best practices 2026",
  "limit": 5
}

// Then scrape the most relevant results
{
  "url": "https://logrocket.com/blog/react-file-upload-2026",
  "formats": ["markdown"],
  "onlyMainContent": true
}
```

### npm Package Evaluation

For evaluating npm packages:

```json
// Extract package metadata
{
  "url": "https://www.npmjs.com/package/react-dropzone",
  "formats": ["json"],
  "jsonOptions": {
    "prompt": "Extract package name, latest version, weekly downloads, last publish date, license, and repository URL",
    "schema": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "version": { "type": "string" },
        "weeklyDownloads": { "type": "string" },
        "lastPublished": { "type": "string" },
        "license": { "type": "string" },
        "repository": { "type": "string" }
      }
    }
  }
}
```

### Multi-Library Comparison

When comparing multiple libraries:

```json
{
  "urls": [
    "https://www.npmjs.com/package/react-dropzone",
    "https://www.npmjs.com/package/react-file-drop",
    "https://www.npmjs.com/package/filepond"
  ],
  "prompt": "Extract package name, version, weekly downloads, and last publish date for comparison",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "version": { "type": "string" },
      "downloads": { "type": "string" },
      "lastPublished": { "type": "string" }
    }
  }
}
```

---

## Integration with Research Workflow

**When Firecrawl is available:**

1. **Use for external research phase** — Deep documentation scraping, library evaluation
2. **Follow escalation ladder** — Start simple, escalate only when needed
3. **Cache strategically** — Set `maxAge` for repeated scrapes during research session
4. **Respect copyright** — Extract and paraphrase, don't reproduce large blocks

**When Firecrawl is NOT available:**

Fall back to:
- `WebSearch` — Basic web search
- `WebFetch` — Single page fetch with AI processing

**Output Location:**
- Research findings go to `research/external/` folder
- Sources tracked in `research/external/sources.yaml`
- Findings consolidated in `research/external/findings.md`

---

## Related Files

- Skill: `.claude/skills/karimo/external-research.md`
- Skill: `.claude/skills/karimo/research-methods.md`
- Agent: `.claude/agents/karimo/researcher.md`
- Guide: `.karimo/docs/RESEARCH.md`
