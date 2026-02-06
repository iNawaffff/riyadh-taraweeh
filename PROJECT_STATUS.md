# Riyadh Taraweeh — Project Documentation

A comprehensive directory of Taraweeh prayer imams and mosques in Riyadh, Saudi Arabia. Users can search, filter, listen to imam audio samples, bookmark favorites, track nightly attendance, and contribute imam updates.

**Live:** https://taraweeh.org
**Staging:** https://riyadh-taraweeh-staging-dcfc9cf9ea67.herokuapp.com

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           BROWSER                                    │
│  React SPA (Vite + TypeScript)                                      │
│  - TanStack Query for data fetching & caching                       │
│  - Firebase Auth (Google + Phone OTP)                               │
│  - Tailwind CSS + shadcn/ui                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         FLASK SERVER                                 │
│  - Serves React SPA (frontend/dist/)                                │
│  - REST API (/api/*)                                                │
│  - Flask-Admin panel (/admin)                                       │
│  - Firebase token verification                                       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │PostgreSQL│ │  AWS S3  │ │ Firebase │
              │ Database │ │  Audio   │ │   Auth   │
              └──────────┘ └──────────┘ └──────────┘
```

### Request Flow

```
[Browser] → [Flask]
              │
              ├─→ /api/*           → JSON API responses
              ├─→ /static/*        → Audio files, images (Flask static)
              ├─→ /admin/*         → Flask-Admin (Jinja2 templates)
              ├─→ /assets/*        → React JS/CSS bundles (from frontend/dist/)
              └─→ /* (other)       → React SPA (frontend/dist/index.html)
```

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | Flask 3.1.0 |
| ORM | SQLAlchemy 2.0.38 |
| Database | PostgreSQL (Heroku) |
| Migrations | Alembic via Flask-Migrate |
| Auth | Firebase Admin SDK (public), Flask-Login (admin) |
| Admin Panel | Flask-Admin with Bootstrap3 |
| Audio Storage | AWS S3 |
| Rate Limiting | Flask-Limiter |
| Compression | flask-compress (gzip/brotli) |
| WSGI Server | Gunicorn |
| Deployment | Heroku (EU region) |

### Frontend
| Component | Technology |
|-----------|------------|
| Build Tool | Vite 7.x |
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 3.4 + tailwindcss-rtl |
| Components | shadcn/ui (Radix primitives) |
| Routing | react-router-dom v7 |
| Data Fetching | TanStack Query (React Query) |
| Auth | Firebase Auth |
| SEO | react-helmet-async |
| Icons | lucide-react, react-icons (Font Awesome) |
| Toasts | sonner |
| PWA | vite-plugin-pwa + Workbox |
| Error Tracking | Sentry |

---

## Project Structure

```
riyadh_taraweeh/
├── app.py                    # Flask application + all API routes
├── models.py                 # SQLAlchemy database models
├── utils.py                  # Arabic text normalization utilities
├── Procfile                  # Heroku process definition
├── requirements.txt          # Python dependencies
├── package.json              # Root package.json for Heroku build
│
├── migrations/               # Alembic database migrations
│   └── versions/
│
├── static/                   # Flask static files
│   ├── audio/               # Imam audio samples
│   └── images/              # Logos, favicons, icons
│
├── templates/                # Jinja2 templates (admin only)
│
└── frontend/                 # React SPA
    ├── vite.config.ts       # Vite + PWA configuration
    ├── tailwind.config.ts   # Tailwind + custom theme
    ├── tsconfig.json
    ├── package.json
    │
    ├── public/              # Static assets copied to dist/
    │
    └── src/
        ├── App.tsx          # Root component + providers + routes
        ├── index.css        # Tailwind + custom CSS animations
        ├── main.tsx         # Entry point
        │
        ├── components/
        │   ├── ui/          # shadcn/ui primitives (button, card, dialog, etc.)
        │   ├── icons/       # Custom icons (MosqueIcon via Font Awesome)
        │   ├── layout/      # Header, Footer, MobileMenu
        │   ├── mosque/      # MosqueCard, MosqueGrid, FavoriteButton, TransferDialog
        │   ├── search/      # SearchBar, AreaFilter, ProximityButton
        │   ├── audio/       # AudioButton, FloatingAudioPlayer
        │   ├── auth/        # LoginDialog, UsernameSetup
        │   └── seo/         # MetaTags, StructuredData (JSON-LD)
        │
        ├── pages/
        │   ├── HomePage.tsx
        │   ├── MosqueDetailPage.tsx
        │   ├── MakkahSchedulePage.tsx
        │   ├── FavoritesPage.tsx
        │   ├── TrackerPage.tsx
        │   ├── LeaderboardPage.tsx
        │   ├── ProfilePage.tsx
        │   ├── AboutPage.tsx
        │   ├── ContactPage.tsx
        │   └── NotFoundPage.tsx
        │
        ├── hooks/
        │   ├── use-mosques.ts      # Mosque data queries
        │   ├── use-transfers.ts    # Imam transfer system hooks
        │   ├── use-audio-player.ts
        │   ├── use-auth.ts
        │   ├── use-favorites.ts
        │   ├── use-geolocation.ts
        │   └── use-debounce.ts
        │
        ├── context/
        │   ├── AudioContext.tsx
        │   ├── AuthContext.tsx
        │   └── FavoritesContext.tsx
        │
        ├── lib/
        │   ├── api.ts           # API client functions
        │   ├── firebase.ts      # Firebase config
        │   ├── arabic-utils.ts  # Arabic numerals, dates, pluralization (التمييز العددي)
        │   └── utils.ts         # cn() utility
        │
        └── types/
            └── index.ts         # TypeScript interfaces
```

---

## Database Schema

```
┌─────────────────┐       ┌─────────────────┐
│     mosque      │       │      imam       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ id (PK)         │
│ name            │       │ name            │
│ location        │       │ audio_sample    │
│ area            │       │ youtube_link    │
│ map_link        │       │ mosque_id (FK)  │
│ latitude        │       └─────────────────┘
│ longitude       │
└─────────────────┘
         │
         │
┌────────┴────────┐       ┌─────────────────────────┐
│                 │       │    imam_transfer_request │
│                 │       ├─────────────────────────┤
│   user_favorite │       │ id (PK)                 │
├─────────────────┤       │ submitter_id (FK)       │
│ id (PK)         │       │ mosque_id (FK)          │
│ user_id (FK)    │       │ current_imam_id (FK)    │
│ mosque_id (FK)  │       │ new_imam_id (FK)        │
│ created_at      │       │ new_imam_name           │
└─────────────────┘       │ notes                   │
         │                │ status                  │
         │                │ reject_reason           │
         ▼                │ created_at              │
┌─────────────────┐       │ reviewed_at             │
│   public_user   │       │ reviewed_by (FK)        │
├─────────────────┤       └─────────────────────────┘
│ id (PK)         │
│ firebase_uid    │       ┌─────────────────────────┐
│ username        │       │   taraweeh_attendance   │
│ display_name    │       ├─────────────────────────┤
│ avatar_url      │       │ id (PK)                 │
│ email           │       │ user_id (FK)            │
│ phone           │       │ night (1-30)            │
│ contribution_   │       │ mosque_id (FK, nullable)│
│   points        │       │ created_at              │
│ created_at      │       └─────────────────────────┘
└─────────────────┘

┌─────────────────┐
│      user       │  (Admin users only)
├─────────────────┤
│ id (PK)         │
│ username        │
│ password_hash   │
└─────────────────┘
```

---

## API Endpoints

### Public Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mosques` | List all mosques with imam data |
| GET | `/api/mosques/<id>` | Single mosque details |
| GET | `/api/mosques/search?q=` | Search mosques by name (Arabic normalized) |
| GET | `/api/mosques/nearby?lat=&lng=` | Mosques sorted by distance |
| GET | `/api/locations` | Distinct area/location values for filters |
| GET | `/api/imams/search?q=` | Search imams (fuzzy Arabic matching) |
| GET | `/api/leaderboard` | Top 20 contributors by points |
| GET | `/api/u/<username>` | Public user profile |
| GET | `/api/u/<username>/tracker` | Public tracker data |

### Authenticated Endpoints (Firebase token required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register/update user after Firebase auth |
| GET | `/api/auth/me` | Current user data |
| GET | `/api/user/favorites` | User's favorited mosques |
| POST | `/api/user/favorites` | Add favorite |
| DELETE | `/api/user/favorites/<mosque_id>` | Remove favorite |
| GET | `/api/user/tracker` | User's attendance data |
| POST | `/api/user/tracker` | Mark night attended |
| DELETE | `/api/user/tracker/<night>` | Unmark attendance |
| POST | `/api/transfers` | Submit imam transfer request |
| DELETE | `/api/transfers/<id>` | Cancel pending request |
| GET | `/api/user/transfers` | User's transfer history |

### Admin Endpoints (Flask-Login required)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transfers/<id>/approve` | Approve transfer + award point |
| POST | `/api/transfers/<id>/reject` | Reject with reason |
| GET | `/admin/` | Flask-Admin panel |

---

## Key Features

### 1. Mosque Discovery
- **Search**: Arabic text normalization (diacritics removal, letter variants)
- **Filtering**: Area dropdown (شمال/شرق/غرب/جنوب) + district/neighborhood
- **Proximity**: Geolocation-based sorting with distance badges
- **Audio Preview**: Listen to imam recitation samples before visiting
- **Progressive Reveal**: Shows 8 mosques initially with "عرض المزيد" / "عرض الكل" buttons, animated card entrance, auto-resets on filter changes

### 2. User Features
- **Favorites**: Heart icon, synced to server, dedicated page with filters
- **Tracker**: 30-night Ramadan attendance grid with streaks
- **Profile**: Public profiles at `/u/<username>`

### 3. Crowdsourced Imam Updates (New in 2026)
- **Transfer Reports**: Users report when imams change mosques
- **Admin Review**: Approve/reject with inline editing
- **Contribution Points**: Gamification system
- **Leaderboard**: Top contributors with pioneer badge
- **Pioneer Badge**: First-ever approved user gets permanent "رائد" badge

### 4. Audio Player
- Floating player with progress bar
- Seek functionality
- Persists across page navigation
- Play/pause from mosque cards or detail page

### 5. PWA Support
- Installable on mobile devices
- Service worker with Workbox
- Runtime caching for fonts, API, images, audio

---

## Performance Optimizations

### Backend
| Optimization | Implementation |
|--------------|----------------|
| N+1 Query Fix | Joined queries (Mosque+Imam) in `/api/mosques`, `/api/mosques/search`, `/api/mosques/nearby`, `/api/u/<username>` — ~119 queries → 1 |
| Response Compression | flask-compress with gzip/brotli (~80KB → ~8KB JSON) |
| HTTP Cache Headers | `@after_request` hook: immutable for /assets, 30d for images, 7d for audio, must-revalidate for SW |
| API Response Cache | In-memory cache for `/api/mosques` and `/api/locations`, invalidated on imam/mosque changes |
| Imam Search | In-memory cached index with normalized Arabic, invalidated on DB changes |
| Search Scoring | Multi-tier: exact → prefix → substring → word-starts → bigram similarity |
| Leaderboard | Denormalized `contribution_points` — single indexed query, no JOINs |
| Transfer Duplicates | Composite index on `(submitter_id, mosque_id, status)` |
| Atomic Updates | SQL-level `contribution_points + 1` to avoid race conditions |

### Frontend
| Optimization | Implementation |
|--------------|----------------|
| Code Splitting | Lazy-loaded pages via `React.lazy()` |
| Bundle Chunking | Manual chunks for router, UI vendor, Firebase, Sentry |
| Query Caching | TanStack Query with staleTime (imam search: 30s, leaderboard: 5min) |
| Debouncing | 300ms debounce on search inputs |
| Conditional Fetching | `enabled` flag on queries (e.g., imam search only when query.length >= 1) |
| Image Optimization | Proper sizing, lazy loading |
| CSS | Tailwind purge, minimal custom CSS |

### PWA Caching Strategy
| Resource | Strategy | TTL |
|----------|----------|-----|
| Google Fonts | CacheFirst | 1 year |
| API responses | NetworkFirst | 24 hours |
| Images | CacheFirst | 30 days |
| Local audio (/static/audio) | CacheFirst | 7 days |
| S3 audio (imams-riyadh-audio.s3) | CacheFirst | 7 days (with range requests for seeking) |

---

## Deployment

### Environments

| | Production | Staging |
|---|---|---|
| **Heroku app** | `riyadh-taraweeh-eu` | `riyadh-taraweeh-staging` |
| **URL** | https://taraweeh.org | https://riyadh-taraweeh-staging-dcfc9cf9ea67.herokuapp.com |
| **Git remote** | `heroku` | `staging` |
| **Database** | Production PostgreSQL | Cloned from production |

### Deploy Commands

```bash
# Deploy to STAGING first
git push staging main
heroku run flask db upgrade -a riyadh-taraweeh-staging

# After verifying, deploy to PRODUCTION
git push heroku main
heroku run flask db upgrade -a riyadh-taraweeh-eu

# Push to GitHub
git push origin main
```

### Heroku Buildpacks (order matters)
1. **Node.js** — Runs `heroku-postbuild` to build React (`npm ci && npm run build`)
2. **Python** — Installs requirements, runs gunicorn

### Environment Variables

**Backend (runtime):**
- `SECRET_KEY`, `DATABASE_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`
- `FIREBASE_SERVICE_ACCOUNT` (JSON string)
- `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`

**Frontend (build-time):**
- `VITE_FIREBASE_*` — Firebase config
- `VITE_GOOGLE_MAPS_API_KEY`
- `NPM_CONFIG_PRODUCTION=false` — Install devDependencies

---

## Ramadan 1447 (2026) Feature Summary

### What's New This Year

1. **Imam Transfer System**
   - Crowdsourced imam change reporting
   - Admin approval workflow
   - Contribution points gamification

2. **Leaderboard (المساهمون)**
   - Renamed from "المتصدرون" to "المساهمون" for humble, spiritual tone
   - Uses "مساهمات" (contributions) instead of "نقاط" (points)
   - HandHeart icon instead of Trophy/Crown
   - Spiritual CTA for non-signed-in users ("كل تحديث صحيح صدقة جارية")
   - Pioneer badge for first contributor
   - Staggered animations, podium design

3. **Enhanced Search**
   - Advanced Arabic fuzzy matching
   - Prefix stripping (الشيخ، شيخ، الامام)
   - Bigram similarity for typo tolerance

4. **UI/UX Polish**
   - First-contribution celebration (confetti)
   - Duaa thank-you messages
   - Smooth animations throughout

5. **Profile Enhancements**
   - Contribution history with status badges
   - Pioneer badge display
   - Transfer request management
   - Member-since date display

6. **Arabic Language Quality**
   - Proper noun pluralization (التمييز العددي rules)
   - Singular/dual/plural forms for nights, favorites, contributions, points
   - RTL-safe username display (`dir="ltr"` for @handles)

7. **Authentication UX**
   - Redesigned login dialog with elegant branded header
   - Smart Saudi phone number parsing (accepts 05..., 5..., +966..., 00966...)
   - Auto-formatting phone display (5XX XXX XXXX)
   - Beautiful OTP input with 3—3 split layout
   - Smooth mode transitions with fade animations
   - Firebase Phone + Google sign-in

8. **Navigation UX**
   - Pill-shaped header buttons with text labels (better discoverability)
   - Favorites button shows "المفضلة" label or count when items exist
   - UserMenu shows user name + chevron (more clickable affordance)
   - Favorites acts as CTA when logged out (opens login dialog)

9. **Makkah Haram Schedule Page (`/makkah`)**
   - Complete imam schedule for Taraweeh (30 nights) and Tahajjud (last 10 nights)
   - 7 Haram imams with full titles and S3-hosted audio samples
   - Tab navigation between التراويح and التهجد
   - Night cards with expandable imam assignments per tesleemat
   - Proper Arabic ordinal numbering (الليلة الأولى، الثانية، etc.)
   - Color-coded imam badges for visual distinction
   - Audio playback integrated with global AudioContext (IDs 9001–9007)
   - ImamCard component with tappable play, soundbars, golden accents
   - Mobile-first responsive design with premium spiritual luxury aesthetic

10. **Audio UX Overhaul**
    - Redesigned imam row as full-width tappable play area (MosqueCard + MosqueDetailPage)
    - Solid green play circle with breathing pulse animation for idle affordance
    - GPU-composited soundbar animations (`transform: scaleY`) — no layout reflow
    - Gold shimmer hover effect on desktop
    - Stretched link pattern — entire MosqueCard is tappable to navigate to detail page
    - RTL chevron indicator (ChevronLeft) with hover animation for navigation cue
    - Nested interactive elements (audio, favorite, share, YouTube, map) elevated with `z-10`
    - "اضغط للاستماع" (press to listen) explicit CTA text
    - Dimmed no-audio fallback to create clear visual hierarchy

11. **Performance & Caching**
    - Fixed N+1 database queries across 4 major API endpoints
    - Response compression via flask-compress (gzip/brotli)
    - HTTP cache headers for static assets (immutable for Vite-hashed bundles)
    - Server-side API response caching with automatic invalidation
    - PWA runtime caching for S3-hosted audio files (with range request support)

12. **SEO Technical Foundation**
    - Canonical URL (`https://taraweeh.org/`)
    - Open Graph meta tags (title, description, image, locale)
    - Twitter Card meta tags (`summary_large_image`)
    - OG image (1200×630) with proper dimensions for all platforms
    - Geo meta tags (ICBM, geo.region, geo.placename)
    - Enhanced JSON-LD structured data (`@type: Mosque`, breadcrumbs)
    - Updated sitemap with all pages (map, favorites, tracker, leaderboard, makkah)

13. **Firebase Phone Auth Improvements**
    - Aggressive reCAPTCHA reset on retry (recreates container element, removes iframes)
    - Explicit `render()` call before `signInWithPhoneNumber`
    - Attempt tracking with max 3 retries
    - "إعادة المحاولة من جديد" reset button when max attempts reached

14. **Icon System**
    - Added react-icons package for Font Awesome icons
    - Custom MosqueIcon component using Font Awesome `FaMosque`
    - Themed icon containers matching MakkahSchedulePage design (bg-primary/10, rounded-xl)

---

## Data Statistics

- **Mosques:** 118
- **Imams:** 119
- **Areas:** 4 (شمال، شرق، غرب، جنوب)
- **Districts:** ~66 distinct neighborhoods

---

## Domain Knowledge

### What is Taraweeh?

صلاة التراويح is a sunnah mu'akkadah prayer performed every night during Ramadan after Isha. The name comes from "الترويحة" (rest) because worshippers rest between every four rak'ahs.

**Number of Rak'ahs:** 11, 13, 20, or 23 are all valid (Sheikh Ibn Baz).

### The Riyadh Taraweeh Scene

Riyadh has a vibrant Taraweeh culture. People travel across the city to pray behind specific imams known for their recitation styles. This app helps users:
1. Preview imam recitation before visiting
2. Find nearest mosque with a specific reciter
3. Track attendance across 30 nights
4. Contribute to keeping data accurate

---

## Future Ideas

- **Last 10 Nights Mode** — Laylat al-Qadr highlighting
- **Rakaat Tracking** — Record number of rak'ahs per night
- **Dark Mode** — Ramadan night theme
- **Browse by Imam** — Filter/compare reciters
- **Push Notifications** — Daily reminders
- **Multi-City** — Jeddah, Makkah, Madinah, Dammam
