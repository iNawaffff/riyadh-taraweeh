# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Riyadh Taraweeh is a Flask + React web application serving as a directory of Taraweeh prayer imams and mosques in Riyadh, Saudi Arabia. Users can search, filter by area and district, sort by proximity, listen to imam audio samples, bookmark favorites, and track nightly attendance.

## Tech Stack

### Backend
- **Framework:** Flask 3.1.0, SQLAlchemy 2.0.38, PostgreSQL
- **Migrations:** Alembic via Flask-Migrate
- **Auth:** Firebase Admin SDK (public users), Flask-Login (admin)
- **Admin:** Flask-Admin with Bootstrap3 (Jinja2 templates)
- **External Services:** AWS S3 (audio storage), Gmail SMTP (error reports)
- **Deployment:** Gunicorn on Heroku

### Frontend (React SPA)
- **Build Tool:** Vite
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS 3.4 + tailwindcss-rtl
- **Components:** shadcn/ui (Radix primitives)
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
              ├─→ /api/*           → JSON responses (API)
              ├─→ /static/*        → Audio, images (Flask static)
              ├─→ /admin/*         → Flask-Admin (Jinja2)
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
- Admin routes: `/admin/`, `/login`, `/admin/upload-audio`, `/admin/mosque/swap-imam/<id>`

### Frontend (`frontend/src/`)

```
src/
├── App.tsx              # Providers (Query, Audio, Favorites, Auth) + Routes
├── index.css            # Tailwind + CSS variables + animations
├── lib/
│   ├── api.ts           # fetchMosques, searchMosques, fetchLocations, etc.
│   ├── arabic-utils.ts  # normalizeArabic, formatDistance, formatArabicDate
│   ├── firebase.ts      # Firebase Auth config
│   └── utils.ts         # cn() utility
├── hooks/
│   ├── use-mosques.ts   # TanStack Query hooks (useMosques, useSearchMosques, useLocations, etc.)
│   ├── use-audio-player.ts
│   ├── use-auth.ts      # Firebase auth state
│   ├── use-favorites.ts
│   ├── use-geolocation.ts
│   ├── use-debounce.ts
│   └── use-media-query.ts
├── context/
│   ├── AudioContext.tsx     # Global audio state, progress, seek
│   ├── AuthContext.tsx      # Firebase auth provider
│   └── FavoritesContext.tsx # Server-synced favorites (auth) + localStorage fallback
├── components/
│   ├── ui/              # shadcn/ui (button, card, dialog, select, sheet, etc.)
│   ├── layout/          # Header, Footer, MobileMenu, ScrollToTop
│   ├── mosque/          # MosqueCard, MosqueGrid, FavoriteButton
│   ├── search/          # SearchBar, AreaFilter, ProximityButton, HeroBanner
│   ├── audio/           # AudioButton, FloatingAudioPlayer
│   ├── auth/            # LoginDialog
│   ├── seo/             # SEO components
│   ├── PageLoader.tsx
│   └── ErrorFallback.tsx
└── pages/
    ├── HomePage.tsx          # Search, area/district filters, proximity, favorites toggle
    ├── MosqueDetailPage.tsx  # Individual mosque page
    ├── FavoritesPage.tsx     # User favorites with area/district filters
    ├── TrackerPage.tsx       # Nightly attendance tracker (30 nights)
    ├── ProfilePage.tsx       # Public user profile
    ├── AboutPage.tsx
    ├── ContactPage.tsx
    └── NotFoundPage.tsx
```

### Database Models (`models.py`)

- **Mosque:** name, location (district/neighborhood), area (شمال/شرق/غرب/جنوب), map_link, latitude, longitude
- **Imam:** name, audio_sample, youtube_link, foreign key to Mosque
- **User:** Admin authentication with password hashing (Flask-Login)
- **PublicUser:** Firebase-authed public users (firebase_uid, username, display_name, avatar_url, email, phone)
- **UserFavorite:** User-mosque favorites (user_id, mosque_id, unique constraint)
- **TaraweehAttendance:** Nightly attendance tracking (user_id, night 1-30, optional mosque_id)

## Key Files

| Purpose | File |
|---------|------|
| Flask app + all API routes | `app.py` |
| Database models | `models.py` |
| Arabic text normalization | `utils.py` |
| React app entry | `frontend/src/App.tsx` |
| API client | `frontend/src/lib/api.ts` |
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
- **Admin:** Flask-Admin with imam swap, audio upload to S3
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

## Development Notes

- **RTL:** All UI is right-to-left Arabic using Tajawal font
- **Audio:** Files in `/static/audio/`, some from S3
- **Images:** `/static/images/` (favicon, logo, mosque-icon.svg)
- **Old templates:** Kept in `/templates/` for admin only; public pages use React
- **Heroku:** Root `package.json` has `heroku-postbuild` to build React
- **Local DB:** Use `heroku pg:pull` to clone production (requires PostgreSQL 16 client tools)
- **Data:** 118 mosques, 4 areas, ~66 distinct locations (neighborhoods), 119 imams
