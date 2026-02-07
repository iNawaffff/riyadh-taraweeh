# System Overview

> **Audience:** Junior developers, future engineering team, or anyone onboarding to this codebase.
> **Last audited:** 2026-02-06 (against commit `a751702`)

---

## What Is This?

**Riyadh Taraweeh** (`taraweeh.org`) is a directory of Taraweeh prayer imams and mosques in Riyadh, Saudi Arabia. During Ramadan, people travel across the city to pray behind specific reciters. This app helps them:

1. **Discover** mosques and preview imam recitations (audio samples)
2. **Find** the nearest mosque via geolocation sorting
3. **Track** their 30-night Ramadan attendance with streaks
4. **Contribute** imam changes and new mosque suggestions (crowdsourced via community requests)
5. **Compete** on a contributor leaderboard

---

## Architecture at a Glance

```
                        ┌──────────────────────────────────┐
                        │          USER'S BROWSER          │
                        │   React 19 SPA (TypeScript)      │
                        │   Vite + TanStack Query          │
                        │   Firebase Auth (client-side)    │
                        │   Tailwind CSS + shadcn/ui       │
                        │   PWA (Service Worker/Workbox)   │
                        └──────────────┬───────────────────┘
                                       │  HTTPS
                                       ▼
                        ┌──────────────────────────────────┐
                        │        HEROKU DYNO (web)         │
                        │   Gunicorn → Flask 3.1.0         │
                        │                                  │
                        │   ┌────────────────────────────┐ │
                        │   │  Serves React SPA           │ │
                        │   │  (frontend/dist/)           │ │
                        │   ├────────────────────────────┤ │
                        │   │  REST API  (/api/*)         │ │
                        │   ├────────────────────────────┤ │
                        │   │  Flask-Admin (/admin/*)     │ │
                        │   ├────────────────────────────┤ │
                        │   │  SEO: sitemap, robots.txt   │ │
                        │   │  Meta tag injection         │ │
                        │   └────────────────────────────┘ │
                        └──────┬──────────┬──────────┬─────┘
                               │          │          │
                    ┌──────────┘    ┌─────┘    ┌─────┘
                    ▼               ▼          ▼
             ┌────────────┐  ┌──────────┐  ┌──────────┐
             │ PostgreSQL │  │  AWS S3  │  │ Firebase │
             │  (Heroku)  │  │  Audio   │  │   Auth   │
             │            │  │  Bucket  │  │  (Google │
             │ 6 tables   │  │          │  │  + Phone)│
             └────────────┘  └──────────┘  └──────────┘
```

---

## Request Flow

```
[Browser] ──→ [Heroku Load Balancer] ──→ [Gunicorn] ──→ [Flask]
                                                          │
                ┌─────────────────────────────────────────┤
                │                                         │
     /api/*  ───┤  JSON API (mosque data, auth,           │
                │  favorites, tracker, transfers,          │
                │  leaderboard, search)                    │
                │                                         │
  /static/* ────┤  Flask static files                     │
                │  (audio MP3s, images, favicons)         │
                │                                         │
   /admin/* ────┤  Flask-Admin panel (Jinja2 templates)   │
                │  Protected by Flask-Login               │
                │                                         │
  /assets/* ────┤  Vite-built JS/CSS bundles              │
                │  (content-hashed, immutable cache)      │
                │                                         │
   /* other ────┤  React SPA (frontend/dist/index.html)   │
                │  with injected meta tags per route      │
                └─────────────────────────────────────────┘
```

---

## Tech Stack Summary

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Web Framework | Flask | 3.1.0 |
| ORM | SQLAlchemy | 2.0.38 |
| Database | PostgreSQL | 16 (Heroku) |
| Migrations | Alembic (Flask-Migrate) | 1.15.1 |
| Public Auth | Firebase Admin SDK | 6.6.0 |
| Admin Auth | Flask-Login | 0.6.3 |
| Admin UI | Flask-Admin | 1.6.1 |
| Audio Storage | AWS S3 (boto3) | 1.37.4 |
| Rate Limiting | Flask-Limiter | 3.12 |
| Compression | flask-compress | 1.17 |
| Geolocation | geopy | 2.4.1 |
| WSGI Server | Gunicorn | 23.0.0 |
| Email | Flask-Mail (Gmail SMTP) | 0.10.0 |
| Runtime | Python | 3.11 |
| Hosting | Heroku (EU region) | — |

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Build Tool | Vite | 7.x |
| Framework | React + TypeScript | 19 |
| Styling | Tailwind CSS + tailwindcss-rtl | 3.4 |
| Component Library | shadcn/ui (Radix primitives) | — |
| Routing | react-router-dom | v7 |
| Server State | TanStack Query (React Query) | 5.x |
| Auth (client) | Firebase Auth | 12.8.0 |
| Maps | @vis.gl/react-google-maps | 1.7.1 |
| SEO | react-helmet-async | 2.0.5 |
| Icons | lucide-react + react-icons | — |
| Toasts | sonner | 2.0.7 |
| Error Tracking | Sentry | 10.x |
| PWA | vite-plugin-pwa + Workbox | — |

---

## Data Statistics

| Metric | Count |
|--------|-------|
| Mosques | 118 |
| Imams | 119 |
| Areas (regions) | 4 (شمال، شرق، غرب، جنوب) |
| Neighborhoods | ~66 distinct |
| Local audio files | 27 MP3s |
| S3-hosted audio files | Additional (Makkah imams, newer uploads) |
| Database tables | 7 (mosque, imam, public_user, user_favorite, taraweeh_attendance, imam_transfer_request, community_request) + 1 admin (user) |
| Alembic migrations | 4 |

---

## User Roles

### 1. Anonymous User (no login)
- Browse all mosques
- Search and filter (area, neighborhood)
- Sort by proximity (geolocation)
- Listen to audio samples
- View mosque detail pages
- View public profiles (`/u/<username>`)
- View leaderboard
- View Makkah schedule
- Submit error reports (email-based)

### 2. Authenticated User (Firebase: Google or Phone)
- Everything anonymous can do, plus:
- Favorite/unfavorite mosques (server-synced)
- Track 30-night Ramadan attendance with rakaat count
- Submit imam transfer requests (crowdsourced updates)
- Cancel pending transfer requests
- Public profile page with stats
- Earn contribution points for approved transfers

### 3. Admin (Flask-Login, username/password)
- Flask-Admin panel at `/admin/`
- CRUD operations on Mosques and Imams
- Approve/reject imam transfer requests
- Swap imams between mosques
- Upload audio files to S3
- View/edit all database records

---

## Project File Structure

```
riyadh_taraweeh/
├── app.py                      # Flask app: ALL routes, admin, auth, caching (1631 lines)
├── models.py                   # SQLAlchemy models: 6 tables (104 lines)
├── utils.py                    # Arabic text normalization (32 lines)
├── init_db.py                  # Database initialization script
├── extract_coordinates.py      # GPS extraction from Google Maps URLs
├── Procfile                    # Heroku: gunicorn app:app
├── requirements.txt            # Python dependencies (28 packages)
├── requirements-dev.txt        # Test dependencies (pytest)
├── package.json                # Root: heroku-postbuild hook
├── .python-version             # Python 3.11
│
├── migrations/                 # Alembic migrations
│   ├── env.py
│   └── versions/               # 4 migration files
│
├── static/                     # Flask static assets
│   ├── audio/                  # 27 imam MP3 samples
│   ├── images/                 # Logos, favicons, OG image
│   ├── css/                    # Legacy (deprecated)
│   └── js/                     # Legacy (deprecated)
│
├── templates/                  # Jinja2 templates (admin + legacy)
│   ├── base.html               # Master layout
│   ├── login.html              # Admin login
│   ├── sitemap.xml             # Dynamic sitemap
│   ├── index.html              # Legacy home (deprecated)
│   ├── mosque_detail.html      # Legacy detail (deprecated)
│   ├── about.html              # Legacy about (deprecated)
│   └── contact.html            # Legacy contact (deprecated)
│
├── frontend/                   # React SPA
│   ├── vite.config.ts          # Build config, PWA, proxy, chunking
│   ├── tailwind.config.ts      # Theme, colors, fonts, animations
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # TypeScript config
│   ├── components.json         # shadcn/ui config (RTL)
│   ├── playwright.config.ts    # E2E test config
│   └── src/
│       ├── App.tsx             # Root: providers + routes
│       ├── main.tsx            # Entry: RTL + Sentry
│       ├── index.css           # Tailwind + animations
│       ├── types/index.ts      # TypeScript interfaces
│       ├── lib/                # API client, Firebase, Arabic utils
│       ├── context/            # Audio, Auth, Favorites state
│       ├── hooks/              # TanStack Query hooks, geolocation, debounce
│       ├── pages/              # 11 page components
│       └── components/         # UI components (layout, mosque, search, audio, auth, seo)
│
├── docs/                       # This documentation
├── CLAUDE.md                   # AI coding assistant instructions
├── PROJECT_STATUS.md           # Feature documentation
├── CHANGELOG-staging.md        # Performance/security changelog
├── FRONTEND_MIGRATION.md       # Jinja2 → React migration guide
└── OG-IMAGE-GUIDE.md           # Social media image spec
```

---

## Key Architectural Decisions

1. **Monolith Flask app**: All API routes, admin, auth, and SPA serving in a single `app.py` (1631 lines). No service separation.

2. **Hybrid SPA serving**: Flask serves the built React app in production. In development, Vite dev server proxies API calls to Flask.

3. **Dual auth systems**: Firebase Admin SDK for public users (token verification), Flask-Login for admin users (session-based).

4. **In-memory caching**: API responses and imam search index cached in Python process memory (global variables). Invalidated on data changes. No Redis or external cache.

5. **Python-side search**: Mosque search and imam search both filter/score in Python after loading data from DB. No full-text search engine (Elasticsearch, etc.).

6. **PWA-first**: Service Worker with Workbox for offline capability, installability, and aggressive asset caching.

7. **S3 for new audio, local for legacy**: 27 original audio files in `/static/audio/`, newer uploads go to S3 bucket `imams-riyadh-audio`.

8. **No CI/CD pipeline**: Manual `git push` to Heroku remotes. No GitHub Actions or automated testing in deployment.

---

## Environments

| | Production | Staging |
|---|---|---|
| Heroku app | `riyadh-taraweeh-eu` | `riyadh-taraweeh-staging` |
| URL | https://taraweeh.org | https://riyadh-taraweeh-staging-dcfc9cf9ea67.herokuapp.com |
| Git remote | `heroku` | `staging` |
| Database | Production PostgreSQL | Cloned from production |
| Deploy | `git push heroku main` | `git push staging main` |

---

## Evolution Timeline (from git history)

| Phase | Commits | Key Changes |
|-------|---------|-------------|
| **v1: Foundation** | `efda188`–`73d76e6` | Initial Flask app, admin panel, env vars |
| **v2: Infrastructure** | `7773643`–`b0817d7` | PostgreSQL, Heroku deploy, S3 integration |
| **v3: UI Polish** | `5b88ead`–`0549ad8` | Search improvements, mobile UI, SEO, accessibility |
| **v4: React Migration** | `9fe5bd4`–`343de38` | Full React SPA, Google Maps, about/contact redesign |
| **v5: User Features** | `6069c65`–`6667331` | Auth, favorites, tracker with rakaat, district filter |
| **v6: Staging Struggles** | `95231c5`–`f716f23` | Dockerfile, Cranl, nixpacks attempts → Heroku |
| **v7: Gamification** | `6751692`–`8c1b0e2` | Imam transfer system, leaderboard, contribution points |
| **v8: UX Overhaul** | `2276470`–`7294208` | Login redesign, mobile-first, Makkah schedule, audio UX |
| **v9: Performance** | `b1a6588`–`a751702` | N+1 fixes, compression, caching, SEO, OG image |
