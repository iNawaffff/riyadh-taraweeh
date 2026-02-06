# Deployment Architecture

> **Platform:** Heroku (EU region)
> **Buildpacks:** Node.js (1st) + Python (2nd)
> **Runtime:** Python 3.11, Node.js >=18

---

## Heroku Configuration

### Buildpack Order (critical)

```
1. heroku/nodejs    ← Builds React frontend
2. heroku/python    ← Installs Flask dependencies
```

Order matters because Node.js must build `frontend/dist/` before Python's Gunicorn starts serving it.

### Build Pipeline

```
git push heroku main
  │
  ▼
Heroku detects package.json → Node.js buildpack
  │
  ▼
npm install (root package.json — minimal, just build script)
  │
  ▼
heroku-postbuild hook runs:
  cd frontend && npm ci && npm run build
  │
  ├─→ npm ci: clean install of frontend dependencies
  └─→ npm run build: tsc -b && vite build
       │
       └─→ Output: frontend/dist/ (index.html + JS chunks + CSS + SW)
  │
  ▼
Heroku detects requirements.txt → Python buildpack
  │
  ▼
pip install -r requirements.txt
  │
  ▼
Procfile: web: gunicorn app:app
  │
  ▼
Gunicorn starts Flask → serves React from frontend/dist/
```

### Procfile

```
web: gunicorn app:app
```

- Default Gunicorn settings: 4 sync workers, 30s timeout
- PORT injected by Heroku as environment variable
- Flask binds to `0.0.0.0:$PORT`

### Runtime

```
.python-version: 3.11
package.json engines.node: ">=18.0.0"
```

---

## Environment Variables

### Backend (Runtime)

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes (Heroku auto-sets) | `postgresql:///taraweeh_db` | PostgreSQL connection |
| `SECRET_KEY` | Yes | `"your_local_secret_key"` | Flask session encryption |
| `ADMIN_USERNAME` | Yes | `"admin"` | Admin panel login |
| `ADMIN_PASSWORD` | Yes | `"adminpassword"` | Admin panel password |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | — | JSON string or file path |
| `AWS_ACCESS_KEY_ID` | Yes | — | S3 access |
| `AWS_SECRET_ACCESS_KEY` | Yes | — | S3 secret |
| `S3_BUCKET` | No | `"imams-riyadh-audio"` | Audio bucket name |
| `AWS_REGION` | No | `"us-east-1"` | S3 region |
| `MAIL_SERVER` | No | `"smtp.gmail.com"` | SMTP server |
| `MAIL_PORT` | No | `587` | SMTP port |
| `MAIL_USERNAME` | No | — | SMTP user |
| `MAIL_PASSWORD` | No | — | SMTP password |
| `MAIL_DEFAULT_SENDER` | No | `"info@taraweeh.org"` | Email from address |
| `FLASK_ENV` | No | — | `"development"` disables secure cookies |
| `PORT` | Auto (Heroku) | `5002` | Server port |

### Frontend (Build-time, VITE_ prefix)

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_FIREBASE_API_KEY` | Yes | Firebase client config |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Yes | Firebase storage |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging |
| `VITE_FIREBASE_APP_ID` | Yes | Firebase app ID |
| `VITE_GOOGLE_MAPS_API_KEY` | Yes | Google Maps JS API |
| `VITE_SENTRY_DSN` | No | Sentry error tracking |
| `NPM_CONFIG_PRODUCTION` | Must be `false` | Install devDependencies |

**Important:** `VITE_` vars are baked into the JS bundle at build time. Changing them requires a rebuild.

**Important:** `NPM_CONFIG_PRODUCTION=false` must be set on Heroku, otherwise devDependencies (Vite, TypeScript, etc.) won't be installed and the build will fail.

---

## Two Environments

### Production

| Setting | Value |
|---------|-------|
| Heroku app | `riyadh-taraweeh-eu` |
| URL | https://taraweeh.org |
| Git remote | `heroku` |
| Database | Production PostgreSQL |
| Region | EU |

### Staging

| Setting | Value |
|---------|-------|
| Heroku app | `riyadh-taraweeh-staging` |
| URL | https://riyadh-taraweeh-staging-dcfc9cf9ea67.herokuapp.com |
| Git remote | `staging` |
| Database | Cloned from production |

### Deploy Commands

```bash
# Deploy to STAGING first
git push staging main
heroku run flask db upgrade -a riyadh-taraweeh-staging

# After verifying staging, deploy to PRODUCTION
git push heroku main
heroku run flask db upgrade -a riyadh-taraweeh-eu

# Push to GitHub (for backup/collaboration)
git push origin main
```

### Database Sync

To replicate production database locally:
```bash
dropdb taraweeh_db
heroku pg:pull DATABASE_URL taraweeh_db --app riyadh-taraweeh-eu
flask db stamp head  # Mark migrations as applied on cloned DB
```

Requires PostgreSQL 16 client tools installed locally.

---

## Development Setup

### Two-Terminal Development

```
Terminal 1 — Flask API:
  python app.py
  → Runs on http://localhost:5002

Terminal 2 — React dev server:
  cd frontend && npm run dev
  → Runs on http://localhost:5173
  → Proxies /api, /static, /admin, /login to :5002
```

### Vite Proxy Configuration

```typescript
// frontend/vite.config.ts
server: {
  proxy: {
    '/api': 'http://localhost:5002',
    '/static': 'http://localhost:5002',
    '/report-error': 'http://localhost:5002',
    '/admin': 'http://localhost:5002',
    '/login': 'http://localhost:5002',
  }
}
```

### Production Mode Detection

Flask checks if `frontend/dist/` exists to enable React SPA serving:

```python
REACT_BUILD_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
USE_REACT_FRONTEND = os.path.isdir(REACT_BUILD_DIR)
```

---

## Bundle Splitting Strategy

Vite produces these chunks:

```
frontend/dist/
├── index.html                          # Entry HTML
├── assets/
│   ├── index-[hash].js                 # Main app bundle
│   ├── router-[hash].js                # react-router-dom
│   ├── ui-vendor-[hash].js             # Radix UI components
│   ├── query-[hash].js                 # TanStack Query
│   ├── firebase-auth-[hash].js         # Firebase Auth (lazy)
│   ├── firebase-app-[hash].js          # Firebase core
│   ├── sentry-[hash].js               # Sentry (production only)
│   └── index-[hash].css               # All styles
├── sw.js                               # Service Worker
├── registerSW.js                       # SW registration
└── manifest.webmanifest                # PWA manifest
```

Content-hashed filenames enable immutable caching (1 year).

---

## Historical Deployment Attempts

From git history, the project went through several hosting platforms before settling on Heroku:

| Attempt | Commits | Outcome |
|---------|---------|---------|
| Cranl (some PaaS) | `b5452c6`–`1952602` | Failed: nixpacks, Dockerfile, debug endpoints |
| Heroku | `1ce4fde`–present | Success: Node.js + Python buildpacks |

Artifacts from Cranl attempt still exist in git history (Dockerfile, nixpacks.toml, react_dist/ fallback) but are no longer in the codebase.

---

## CI/CD Status

**Current state: NO automated CI/CD.**

- No GitHub Actions workflows
- No automated tests on push
- No automated deployment
- Manual `git push` to Heroku remotes

### Testing Infrastructure (Available but not automated)

```bash
# Backend tests
pip install -r requirements-dev.txt
pytest

# Frontend unit tests
cd frontend && npm run test:run

# Frontend E2E tests
cd frontend && npm run test:e2e
```

Playwright configured for Desktop Chrome + Mobile Safari, locale ar-SA.
