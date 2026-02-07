# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Riyadh Taraweeh is a Flask + React web application serving as a directory of Taraweeh prayer imams and mosques in Riyadh, Saudi Arabia. Users can search, filter by area and district, sort by proximity, listen to imam audio samples, bookmark favorites, and track nightly attendance.

## Tech Stack

### Backend
- **Framework:** Flask 3.1.0, SQLAlchemy 2.0.38, PostgreSQL
- **Migrations:** Alembic via Flask-Migrate
- **Auth:** Firebase Admin SDK (public users), Flask-Login (legacy admin)
- **RBAC:** `role` column on `public_user` — `user` / `moderator` / `admin`
- **Admin (new):** Custom React admin panel at `/dashboard/*` with Firebase auth + role check
- **Admin (legacy):** Flask-Admin at `/admin/` with Flask-Login (still functional)
- **External Services:** AWS S3 (audio storage), Gmail SMTP (error reports), yt-dlp + ffmpeg (audio pipeline)
- **Deployment:** Gunicorn on Heroku

### Frontend (React SPA)
- **Build Tool:** Vite
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS 3.4 + tailwindcss-rtl
- **Components:** shadcn/ui (Radix primitives)
- **Data Tables:** TanStack Table (admin panel)
- **Forms:** react-hook-form (admin panel)
- **Audio:** wavesurfer.js + RegionsPlugin (admin audio trimming)
- **Routing:** react-router-dom v7
- **Data Fetching:** TanStack Query (React Query)
- **Auth:** Firebase Auth (Google/phone sign-in)
- **SEO:** react-helmet-async
- **Icons:** lucide-react
- **Toasts:** sonner

## Commands

```bash
# === Development ===

# Terminal 1: Flask API (port 5002)
python app.py

# Terminal 2: Vite dev server (port 5173)
cd frontend && npm run dev

# Visit http://localhost:5173 for hot-reload development

# === Production Build ===
cd frontend && npm run build   # Creates frontend/dist/

# === Database ===
flask db migrate -m "description"
flask db upgrade

# Replicate production DB locally:
# dropdb taraweeh_db && heroku pg:pull DATABASE_URL taraweeh_db --app riyadh-taraweeh-eu
# flask db stamp head  (mark migrations as applied on cloned DB)

# === Utilities ===
python extract_coordinates.py  # Extract GPS from Google Maps links
```

## Architecture

### How Flask + React Work Together

```
[Browser] → [Flask Server]
              │
              ├─→ /api/*           → JSON responses (public API + community requests)
              ├─→ /api/admin/*     → Admin API (Firebase auth + role check, incl. request review)
              ├─→ /static/*        → Audio, images (Flask static)
              ├─→ /admin/*         → Flask-Admin legacy (Jinja2, Flask-Login)
              ├─→ /dashboard/*     → React admin panel SPA
              ├─→ /assets/*        → React JS/CSS (from frontend/dist/)
              └─→ /* (other)       → React SPA (frontend/dist/index.html)
```

- **Development:** Vite proxies `/api`, `/static`, `/report-error` to Flask
- **Production:** Flask serves React build, detects via `USE_REACT_FRONTEND` flag

### Main Application (`app.py`)

Flask app serving both API and React SPA:
- `REACT_BUILD_DIR` / `USE_REACT_FRONTEND` - React integration
- `serve_react_app()` - Serves React or falls back to Jinja2
- API routes: `/api/mosques`, `/api/mosques/search`, `/api/mosques/nearby`, `/api/locations`
- Auth routes: `/api/auth/register`, `/api/auth/me`
- Favorites routes: `/api/user/favorites`
- Tracker routes: `/api/user/tracker`
- Public profile: `/api/u/<username>`, `/api/u/<username>/tracker`
- Community requests (public): `/api/requests` (submit/list), `/api/requests/<id>/cancel`, `/api/requests/check-duplicate`
- Community requests (admin): `/api/admin/requests`, `/api/admin/requests/<id>`, `/api/admin/requests/<id>/approve|reject|needs-info`
- Legacy admin routes: `/admin/`, `/login`, `/admin/upload-audio`, `/admin/mosque/swap-imam/<id>`
- New admin API: `/api/admin/stats`, `/api/admin/mosques`, `/api/admin/imams`, `/api/admin/transfers`, `/api/admin/users`, `/api/admin/audio/*`
- Dashboard catch-all: `/dashboard`, `/dashboard/<path:path>` → React SPA

### Frontend (`frontend/src/`)

```
src/
├── App.tsx              # Providers (Query, Audio, Favorites, Auth) + Routes (public + admin)
├── index.css            # Tailwind + CSS variables + animations
├── lib/
│   ├── api.ts           # fetchMosques, searchMosques, fetchLocations, etc.
│   ├── admin-api.ts     # Admin API client (CRUD mosques/imams/transfers/users, audio pipeline)
│   ├── requests-api.ts  # Community requests API client (submit, list, cancel, admin review)
│   ├── constants.ts     # Shared constants (AREAS array)
│   ├── arabic-utils.ts  # normalizeArabic, formatDistance, formatArabicDate
│   ├── firebase.ts      # Firebase Auth config
│   └── utils.ts         # cn() utility
├── hooks/
│   ├── use-mosques.ts   # TanStack Query hooks (useMosques, useSearchMosques, useLocations, etc.)
│   ├── use-admin.ts     # Admin TanStack Query hooks (CRUD, audio extract/trim)
│   ├── use-requests.ts  # Community requests TanStack Query hooks
│   ├── use-audio-player.ts
│   ├── use-auth.ts      # Firebase auth state (includes role)
│   ├── use-favorites.ts
│   ├── use-geolocation.ts
│   ├── use-debounce.ts
│   └── use-media-query.ts
├── context/
│   ├── AudioContext.tsx     # Global audio state, progress, seek
│   ├── AuthContext.tsx      # Firebase auth provider (includes user.role)
│   └── FavoritesContext.tsx # Server-synced favorites (auth) + localStorage fallback
├── components/
│   ├── ui/              # shadcn/ui (button, card, dialog, select, sheet, table, form, etc.)
│   ├── admin/           # Admin panel components (see below)
│   ├── layout/          # Header, Footer, MobileMenu, ScrollToTop
│   ├── mosque/          # MosqueCard, MosqueGrid, FavoriteButton
│   ├── search/          # SearchBar, AreaFilter, ProximityButton, HeroBanner
│   ├── audio/           # AudioButton, FloatingAudioPlayer
│   ├── auth/            # LoginDialog, UserMenu (profile dropdown)
│   ├── seo/             # SEO components
│   ├── PageLoader.tsx
│   └── ErrorFallback.tsx
├── components/admin/
│   ├── AdminGuard.tsx       # Role-based route protection (admin/moderator only)
│   ├── AdminSidebar.tsx     # RTL sidebar navigation with gold/green theme
│   ├── AdminHeader.tsx      # Top bar with user info, logout, back-to-site
│   ├── DataTable.tsx        # Reusable TanStack Table wrapper (sort, search, pagination)
│   ├── AudioPipeline.tsx    # URL → yt-dlp extract → wavesurfer.js waveform → trim → S3
│   └── MosqueForm.tsx       # Combined mosque+imam+audio create/edit form
└── pages/
    ├── HomePage.tsx          # Search, area/district filters, proximity, favorites toggle
    ├── MosqueDetailPage.tsx  # Individual mosque page
    ├── FavoritesPage.tsx     # User favorites with area/district filters
    ├── TrackerPage.tsx       # Nightly attendance tracker (30 nights)
    ├── ProfilePage.tsx       # Public user profile
    ├── LeaderboardPage.tsx   # Contributors leaderboard
    ├── MapPage.tsx           # Interactive map view
    ├── AboutPage.tsx
    ├── RequestPage.tsx       # Community request form (new mosque or imam change)
    ├── MyRequestsPage.tsx    # User's request history with status tracking
    ├── ContactPage.tsx
    ├── MakkahSchedulePage.tsx
    ├── NotFoundPage.tsx
    └── admin/
        ├── AdminLayout.tsx      # Sidebar + header + Outlet wrapper
        ├── DashboardPage.tsx    # Stats overview (4 cards)
        ├── MosquesPage.tsx      # Mosques data table + CRUD
        ├── MosqueFormPage.tsx   # Create/edit mosque form
        ├── ImamsPage.tsx        # Imams data table
        ├── TransfersPage.tsx    # Legacy transfer requests (accessible by URL, removed from nav)
        ├── RequestsPage.tsx     # Community request review (approve/reject/needs-info)
        └── UsersPage.tsx        # User management + role assignment
```

### Database Models (`models.py`)

- **Mosque:** name, location (district/neighborhood), area (شمال/شرق/غرب/جنوب), map_link, latitude, longitude
- **Imam:** name, audio_sample, youtube_link, foreign key to Mosque
- **User:** Admin authentication with password hashing (Flask-Login)
- **PublicUser:** Firebase-authed public users (firebase_uid, username, display_name, avatar_url, email, phone, **role**, **trust_level**)
- **UserFavorite:** User-mosque favorites (user_id, mosque_id, unique constraint)
- **TaraweehAttendance:** Nightly attendance tracking (user_id, night 1-30, optional mosque_id)
- **CommunityRequest:** User-submitted requests (request_type: new_mosque/new_imam/imam_transfer, status: pending/approved/rejected/needs_info, mosque/imam details, admin_notes, reviewed_by FK to public_user)

## Key Files

| Purpose | File |
|---------|------|
| Flask app + all API routes | `app.py` |
| Database models | `models.py` |
| Arabic text normalization | `utils.py` |
| React app entry | `frontend/src/App.tsx` |
| Public API client | `frontend/src/lib/api.ts` |
| Admin API client | `frontend/src/lib/admin-api.ts` |
| Admin query hooks | `frontend/src/hooks/use-admin.ts` |
| Requests API client | `frontend/src/lib/requests-api.ts` |
| Requests query hooks | `frontend/src/hooks/use-requests.ts` |
| Firebase config | `frontend/src/lib/firebase.ts` |
| TypeScript types | `frontend/src/types/index.ts` |
| Tailwind config | `frontend/tailwind.config.ts` |
| Vite proxy config | `frontend/vite.config.ts` |

## Key Features

- **Search:** Arabic text normalization, 500ms debounce
- **Filtering:** Area dropdown (شمال/شرق/غرب/جنوب) + district/neighborhood dropdown (الملقا, حطين, etc.)
- **Proximity:** Geolocation-based sorting with distance badges
- **Audio:** Floating player with progress bar and seek
- **Favorites:** Heart icon, Firebase-synced (with localStorage fallback), header badge, dedicated page with filters
- **Tracker:** 30-night Ramadan attendance tracker with streaks
- **Auth:** Firebase (Google/phone), public profiles at `/u/<username>`
- **Community Requests:** Users submit requests at `/request` with 2 user-facing types: "مسجد جديد" (new mosque) and "تغيير إمام" (imam change). The imam change flow maps to `new_imam` or `imam_transfer` backend types depending on whether the user picks an existing imam or types a new name. Both the `/request` page and the TransferDialog (mosque detail page "تغيّر؟" button) submit through the same community request API (`POST /api/requests`). Duplicate detection with Arabic normalization. User history at `/my-requests`. Admin review at `/dashboard/requests` with approve/reject/needs-info.
- **Trust Levels:** `public_user.trust_level` — default/trusted/not_trusted. Auto-upgrade to trusted after 3+ approved requests.
- **Input Validation:** Arabic-only text validation (`_is_arabic_text()`) + sanitization (`_sanitize_text()`) on all user-submitted names.
- **Admin (new):** React admin panel at `/dashboard/*` — CRUD mosques/imams, user roles, audio pipeline (yt-dlp → wavesurfer.js → ffmpeg → S3), community request review. Dashboard stat card shows pending community request count.
- **Admin (legacy):** Flask-Admin at `/admin/` with imam swap, audio upload to S3
- **SEO:** Meta tags, structured data (JSON-LD), sitemap

## Environment Variables

Required in `.env`:
```
SECRET_KEY=...
DATABASE_URL=postgresql://...
ADMIN_USERNAME=...
ADMIN_PASSWORD=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=imams-riyadh-audio
FIREBASE_SERVICE_ACCOUNT=...   # JSON string or file path
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_DEFAULT_SENDER=info@taraweeh.org
```

## Data Naming Conventions

**IMPORTANT:** Follow these standards when adding or modifying data in the database.

### Areas (`mosque.area`)

Exactly 4 canonical values. No variations allowed.

| Allowed Values |
|----------------|
| `شمال` |
| `جنوب` |
| `شرق` |
| `غرب` |

### Locations/Neighborhoods (`mosque.location`)

| Rule | Example | Notes |
|------|---------|-------|
| **No حي prefix** | `الملقا` ✓ | NOT `حي الملقا` |
| **Use ة (taa marbuta)** | `قرطبة` ✓ | NOT `قرطبه` |
| **Keep الـ article** | `الملقا` ✓ | NOT `ملقا` |
| **No trailing spaces** | `الملقا` ✓ | NOT `الملقا ` |
| **Single spaces only** | Normalize multiple spaces |

**UI Display:** The frontend adds "حي " prefix when displaying (e.g., "حي الملقا").

### Mosque Names (`mosque.name`)

| Rule | Example | Notes |
|------|---------|-------|
| **Keep type prefix** | `جامع الراجحي` ✓ | Keep جامع/مسجد/مجمع |
| **Use ة (taa marbuta)** | `مسجد السلامة` ✓ | NOT `مسجد السلامه` |
| **Single spaces only** | `جامع حمد البابطين` ✓ | NOT `جامع حمد  البابطين` |
| **No trailing spaces** | Trim all values |

### Imam Names (`imam.name`)

| Rule | Example | Notes |
|------|---------|-------|
| **Always use الشيخ prefix** | `الشيخ خالد الجليل` ✓ | All imams get this prefix |
| **Use ة (taa marbuta)** | Check feminine endings |
| **Full name required** | First + Last minimum |
| **No trailing spaces** | Trim all values |
| **Single spaces only** | Normalize multiple spaces |

### Data Validation Queries

Run these to audit data quality:

```sql
-- Check areas (should be exactly 4)
SELECT area, COUNT(*) FROM mosque GROUP BY area ORDER BY area;

-- Find locations with حي prefix (should be 0)
SELECT location FROM mosque WHERE location LIKE 'حي %';

-- Find spacing issues
SELECT name FROM mosque WHERE name LIKE '% ' OR name LIKE '%  %';
SELECT name FROM imam WHERE name LIKE '% ' OR name LIKE '%  %';

-- Find imams without الشيخ prefix (should be 0)
SELECT name FROM imam WHERE name NOT LIKE 'الشيخ %';

-- Find ه endings that should be ة (review manually)
SELECT location FROM mosque WHERE location LIKE '%ه' AND location NOT LIKE '%الله';
```

## Development Notes

- **RTL:** All UI is right-to-left Arabic using Tajawal font
- **Audio:** Files in `/static/audio/`, some from S3
- **Images:** `/static/images/` (favicon, logo, mosque-icon.svg)
- **Old templates:** Kept in `/templates/` for admin only; public pages use React
- **Heroku:** Root `package.json` has `heroku-postbuild` to build React
- **Local DB:** Use `heroku pg:pull` to clone production (requires PostgreSQL 16 client tools)
- **Data:** 119 mosques, 4 areas, 59 distinct locations (neighborhoods), 119 imams
- **RBAC:** `public_user.role` column: `user` (default), `moderator`, `admin`. Admin/moderator access `/dashboard/*`. Set role via `UPDATE public_user SET role='admin' WHERE username='...'`
- **Trust:** `public_user.trust_level` column: `default`, `trusted`, `not_trusted`. Auto-upgraded to `trusted` after 3+ approved community requests.
- **Community Requests:** CommunityRequest model in `models.py`. Two user-facing types: "مسجد جديد" (`new_mosque`) and "تغيير إمام" (maps to `new_imam` or `imam_transfer` internally). The TransferDialog on mosque detail pages and the `/request` page both submit to `POST /api/requests`. Admin approval creates real Mosque/Imam records. Arabic duplicate detection uses `normalize_arabic()` from `utils.py`. Old transfer system (`/api/transfers`, `/dashboard/transfers`) is legacy — kept for historical data but no frontend uses it.
- **Admin sidebar:** Shows nav items for Dashboard, Mosques, Imams, Requests (with pending count badge), Users. The legacy Transfers page is accessible by URL only.
- **Flask dev server:** Does NOT auto-reload after code changes. Must manually restart (`Ctrl+C` then `python app.py`).
- **Heroku buildpacks:** Node.js → Python (ffmpeg buildpack needed for audio pipeline: `heroku buildpacks:add --index 1 https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git`)
