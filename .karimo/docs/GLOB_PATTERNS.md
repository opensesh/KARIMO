# KARIMO Glob Pattern Library

Common glob patterns for `never_touch` and `require_review` boundaries across popular frameworks and runtimes.

Use these as starting points during `/karimo:configure` to protect critical files from agent modification.

---

## Universal Patterns (All Projects)

### Build Artifacts & Dependencies
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "node_modules/**"
    - "vendor/**"
    - ".pnp.*"
    - ".yarn/**"

    # Build outputs
    - "dist/**"
    - "build/**"
    - "out/**"
    - ".next/**"
    - ".nuxt/**"
    - ".output/**"

    # Lock files (managed by package manager)
    - "package-lock.json"
    - "yarn.lock"
    - "pnpm-lock.yaml"
    - "Gemfile.lock"
    - "Pipfile.lock"
    - "poetry.lock"
    - "composer.lock"
    - "Cargo.lock"
```

### Environment & Secrets
```yaml
boundaries:
  never_touch:
    # Environment files
    - ".env*"
    - "*.env"
    - ".env.local"
    - ".env.*.local"
    - "secrets.yaml"
    - "secrets.json"

    # Credentials
    - "*.key"
    - "*.pem"
    - "*.crt"
    - "*.p12"
    - "credentials.json"
    - "service-account.json"
```

### Version Control
```yaml
boundaries:
  never_touch:
    # Git internals
    - ".git/**"
    - ".gitattributes"

  require_review:
    # Version control config (review before changing)
    - ".gitignore"
    - ".gitmodules"
```

### CI/CD Configuration
```yaml
boundaries:
  require_review:
    # GitHub Actions
    - ".github/workflows/**"

    # GitLab CI
    - ".gitlab-ci.yml"

    # CircleCI
    - ".circleci/**"

    # Jenkins
    - "Jenkinsfile"

    # Travis
    - ".travis.yml"
```

---

## JavaScript/TypeScript Frameworks

### Next.js
```yaml
boundaries:
  never_touch:
    # Build outputs
    - ".next/**"
    - "out/**"
    - ".swc/**"

    # Cache
    - ".next/cache/**"
    - "public/sw.js"
    - "public/workbox-*.js"

  require_review:
    # Core config (changes affect build/runtime)
    - "next.config.js"
    - "next.config.mjs"
    - "tsconfig.json"
    - "middleware.ts"
    - "instrumentation.ts"
```

### React (Create React App / Vite)
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "build/**"
    - "dist/**"

  require_review:
    # Build config
    - "vite.config.ts"
    - "vite.config.js"
    - "craco.config.js"
    - "tsconfig.json"
    - "tsconfig.node.json"
```

### Vue.js / Nuxt
```yaml
boundaries:
  never_touch:
    # Build outputs
    - ".nuxt/**"
    - ".output/**"
    - "dist/**"

  require_review:
    # Core config
    - "nuxt.config.ts"
    - "nuxt.config.js"
    - "vue.config.js"
    - "tsconfig.json"
```

### Svelte / SvelteKit
```yaml
boundaries:
  never_touch:
    # Build outputs
    - ".svelte-kit/**"
    - "build/**"

  require_review:
    # Core config
    - "svelte.config.js"
    - "vite.config.ts"
    - "tsconfig.json"
```

### Remix
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "build/**"
    - "public/build/**"
    - ".cache/**"

  require_review:
    # Core config
    - "remix.config.js"
    - "tsconfig.json"
```

### Astro
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "dist/**"
    - ".astro/**"

  require_review:
    # Core config
    - "astro.config.mjs"
    - "tsconfig.json"
```

### Angular
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "dist/**"
    - ".angular/**"
    - "tmp/**"

  require_review:
    # Core config
    - "angular.json"
    - "tsconfig.json"
    - "tsconfig.app.json"
    - "tsconfig.spec.json"
```

---

## Backend Frameworks

### Node.js / Express
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "node_modules/**"

    # Uploads (user-generated content)
    - "uploads/**"
    - "public/uploads/**"
    - "storage/**"

  require_review:
    # Server config
    - "server.js"
    - "app.js"
    - "tsconfig.json"
```

### NestJS
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "dist/**"

  require_review:
    # Core modules
    - "src/main.ts"
    - "src/app.module.ts"
    - "nest-cli.json"
    - "tsconfig.json"
```

### Python / Django
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "venv/**"
    - ".venv/**"
    - "env/**"
    - "__pycache__/**"
    - "*.pyc"
    - "*.pyo"

    # Database migrations (historical record)
    - "*/migrations/**"
    - "migrations/**"

    # Media uploads
    - "media/**"
    - "staticfiles/**"

  require_review:
    # Core config
    - "settings.py"
    - "*/settings.py"
    - "urls.py"
    - "wsgi.py"
    - "asgi.py"
    - "manage.py"
```

### Python / Flask
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "venv/**"
    - ".venv/**"
    - "__pycache__/**"
    - "*.pyc"

    # Uploads
    - "uploads/**"
    - "static/uploads/**"

  require_review:
    # App entry
    - "app.py"
    - "wsgi.py"
    - "config.py"
```

### Python / FastAPI
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "venv/**"
    - ".venv/**"
    - "__pycache__/**"
    - "*.pyc"

  require_review:
    # App entry
    - "main.py"
    - "app/main.py"
    - "config.py"
```

### Ruby on Rails
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "vendor/bundle/**"
    - "tmp/**"
    - "log/**"

    # Database migrations (historical record)
    - "db/migrate/**"

    # Uploads
    - "public/uploads/**"
    - "public/packs/**"
    - "public/assets/**"

  require_review:
    # Core config
    - "config/routes.rb"
    - "config/application.rb"
    - "config/environment.rb"
    - "config/environments/*.rb"
    - "Gemfile"
```

### PHP / Laravel
```yaml
boundaries:
  never_touch:
    # Dependencies
    - "vendor/**"

    # Cache and compiled files
    - "bootstrap/cache/**"
    - "storage/framework/**"
    - "storage/logs/**"

    # Database migrations (historical record)
    - "database/migrations/**"

    # Uploads
    - "storage/app/public/**"
    - "public/storage/**"

  require_review:
    # Core config
    - "config/**"
    - "routes/**"
    - "composer.json"
```

### Go
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "bin/**"
    - "*.exe"

    # Vendor (if using)
    - "vendor/**"

  require_review:
    # Entry point
    - "main.go"
    - "go.mod"
    - "go.sum"
```

### Rust
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "target/**"

  require_review:
    # Package config
    - "Cargo.toml"
    - "Cargo.lock"
```

### Java / Spring Boot
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "target/**"
    - "build/**"
    - ".gradle/**"

    # Dependencies
    - ".m2/**"

  require_review:
    # Core config
    - "pom.xml"
    - "build.gradle"
    - "settings.gradle"
    - "src/main/resources/application.properties"
    - "src/main/resources/application.yml"
```

---

## Database & Data Files

### SQL Databases
```yaml
boundaries:
  never_touch:
    # Database files (SQLite)
    - "*.db"
    - "*.sqlite"
    - "*.sqlite3"

    # Database migrations (historical record)
    - "*/migrations/**"
    - "migrations/**"
    - "db/migrate/**"

  require_review:
    # Schema definitions
    - "schema.sql"
    - "schema.prisma"
    - "*/schema.rb"
```

### ORMs
```yaml
boundaries:
  never_touch:
    # Prisma
    - ".prisma/**"

  require_review:
    # Prisma schema
    - "prisma/schema.prisma"

    # TypeORM
    - "ormconfig.json"

    # Sequelize
    - ".sequelizerc"
```

---

## Testing Frameworks

### Jest / Vitest
```yaml
boundaries:
  never_touch:
    # Coverage reports
    - "coverage/**"
    - ".nyc_output/**"

  require_review:
    # Test config
    - "jest.config.js"
    - "jest.config.ts"
    - "vitest.config.ts"
```

### Pytest
```yaml
boundaries:
  never_touch:
    # Coverage and reports
    - ".pytest_cache/**"
    - "htmlcov/**"
    - ".coverage"

  require_review:
    # Test config
    - "pytest.ini"
    - "setup.cfg"
    - "pyproject.toml"
```

---

## Monorepo Tools

### Turborepo
```yaml
boundaries:
  never_touch:
    # Cache
    - ".turbo/**"

  require_review:
    # Config
    - "turbo.json"
```

### Nx
```yaml
boundaries:
  never_touch:
    # Cache
    - ".nx/**"
    - "dist/**"

  require_review:
    # Config
    - "nx.json"
    - "workspace.json"
```

### Lerna
```yaml
boundaries:
  require_review:
    # Config
    - "lerna.json"
```

---

## Mobile Development

### React Native
```yaml
boundaries:
  never_touch:
    # iOS
    - "ios/Pods/**"
    - "ios/build/**"

    # Android
    - "android/.gradle/**"
    - "android/build/**"
    - "android/app/build/**"

  require_review:
    # Native config
    - "ios/Podfile"
    - "android/build.gradle"
    - "android/app/build.gradle"
    - "app.json"
    - "metro.config.js"
```

### Flutter
```yaml
boundaries:
  never_touch:
    # Build outputs
    - "build/**"
    - ".dart_tool/**"

  require_review:
    # Package config
    - "pubspec.yaml"
    - "pubspec.lock"
```

---

## Cloud & Infrastructure

### Terraform
```yaml
boundaries:
  never_touch:
    # State files (managed externally)
    - "*.tfstate"
    - "*.tfstate.backup"
    - ".terraform/**"

  require_review:
    # Infrastructure definitions
    - "*.tf"
    - "terraform.tfvars"
```

### Docker
```yaml
boundaries:
  require_review:
    # Container config
    - "Dockerfile"
    - "docker-compose.yml"
    - "docker-compose.*.yml"
    - ".dockerignore"
```

### Kubernetes
```yaml
boundaries:
  require_review:
    # K8s manifests
    - "k8s/**"
    - "*.yaml"
    - "*.yml"
    - "kustomization.yaml"
```

---

## Security-Sensitive Patterns

### Authentication & Authorization
```yaml
boundaries:
  require_review:
    # Auth logic (critical security)
    - "src/auth/**"
    - "src/security/**"
    - "middleware/auth.ts"
    - "lib/auth.ts"
    - "utils/auth.ts"
```

### Payment Processing
```yaml
boundaries:
  require_review:
    # Payment logic (financial risk)
    - "src/payment/**"
    - "lib/stripe.ts"
    - "services/billing.ts"
```

### API Keys & Configuration
```yaml
boundaries:
  require_review:
    # Config files with sensitive data references
    - "config/keys.ts"
    - "config/api.ts"
    - "src/config/integrations.ts"
```

---

## Package Manager Specific

### npm / Yarn / pnpm
```yaml
boundaries:
  require_review:
    # Dependency changes (security & breaking changes)
    - "package.json"
```

### pip (Python)
```yaml
boundaries:
  require_review:
    # Dependencies
    - "requirements.txt"
    - "requirements/*.txt"
    - "Pipfile"
    - "pyproject.toml"
```

### Bundler (Ruby)
```yaml
boundaries:
  require_review:
    # Dependencies
    - "Gemfile"
```

### Composer (PHP)
```yaml
boundaries:
  require_review:
    # Dependencies
    - "composer.json"
```

### Cargo (Rust)
```yaml
boundaries:
  require_review:
    # Dependencies
    - "Cargo.toml"
```

---

## Usage Examples

### Minimal Protection (Small Projects)
```yaml
boundaries:
  never_touch:
    - "node_modules/**"
    - ".env*"
    - "*.lock"
```

### Standard Protection (Medium Projects)
```yaml
boundaries:
  never_touch:
    - "node_modules/**"
    - ".env*"
    - "*.lock"
    - "dist/**"
    - ".next/**"
    - "coverage/**"

  require_review:
    - "package.json"
    - "tsconfig.json"
    - "next.config.js"
```

### Maximum Protection (Enterprise Projects)
```yaml
boundaries:
  never_touch:
    - "node_modules/**"
    - ".env*"
    - "*.lock"
    - "dist/**"
    - ".next/**"
    - "coverage/**"
    - "db/migrate/**"
    - "uploads/**"

  require_review:
    - "package.json"
    - "tsconfig.json"
    - "next.config.js"
    - "src/auth/**"
    - "src/security/**"
    - "src/payment/**"
    - ".github/workflows/**"
    - "Dockerfile"
    - "docker-compose.yml"
```

---

## Pattern Syntax Reference

### Basic Patterns
- `*.js` — All .js files in current directory
- `**/*.js` — All .js files in all subdirectories
- `src/**` — Everything under src/
- `!test.js` — Exclude test.js (negation)

### Multiple Extensions
- `*.{js,ts}` — Match .js and .ts files
- `*.{yml,yaml}` — Match .yml and .yaml files

### Directory Matching
- `**/node_modules/**` — node_modules anywhere
- `src/**/test/**` — Any test directory under src

### Complex Patterns
- `**/*.spec.{ts,js}` — All spec files (.ts or .js)
- `!**/*.test.ts` — Exclude all test TypeScript files

---

## Customization Tips

1. **Start conservative** — Use restrictive patterns during initial setup
2. **Refine over time** — Remove patterns as agents prove reliable in specific areas
3. **Monitor PRs** — Watch for boundary violations in code review
4. **Document exceptions** — Note why specific files are protected in comments
5. **Team alignment** — Ensure all developers understand protected boundaries

---

## Related Documentation

- [SAFEGUARDS.md](SAFEGUARDS.md) — Boundary enforcement and security
- [GETTING-STARTED.md](GETTING-STARTED.md) — Initial configuration walkthrough
- [COMMANDS.md](COMMANDS.md) — `/karimo:configure` command reference

---

*Last updated: 2026-03-11*
