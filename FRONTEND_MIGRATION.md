# Frontend Migration: Jinja2 → React + Tailwind + shadcn/ui

## Overview

This document describes the migration of taraweeh.org's frontend from Jinja2 templates with vanilla JavaScript to a modern React stack, while keeping Flask as the API server.

**Migration Date:** January 2025
**Status:** Complete (Phase 1)

---

## Architecture

### Before (Jinja2)
```
Flask Server
├── templates/*.html (Jinja2)
├── static/css/styles.css
├── static/js/script.js
└── API routes (/api/*)
```

### After (React SPA)
```
Flask Server
├── frontend/dist/ (React build - served for public routes)
├── templates/ (kept for admin only)
├── static/ (audio, images - still served by Flask)
└── API routes (/api/* - unchanged)
```

### How It Works

1. **Development**: Vite dev server (port 5173) proxies `/api`, `/static`, `/report-error` to Flask (port 5002)
2. **Production**: Flask serves the React build from `/frontend/dist` for all public routes
3. **Admin Panel**: Still uses Jinja2 templates (Flask-Admin with Bootstrap3)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Build Tool | Vite |
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 3.4 + tailwindcss-rtl |
| Components | shadcn/ui (Radix primitives) |
| Routing | react-router-dom v7 |
| Data Fetching | TanStack Query (React Query) |
| SEO | react-helmet-async |
| Icons | lucide-react |
| Font | Tajawal (Google Fonts) |

---

## Project Structure

```
riyadh_taraweeh/
├── app.py                      # Modified: serves React + API
├── package.json                # Root: heroku-postbuild script
├── frontend/                   # React application
│   ├── package.json
│   ├── vite.config.ts          # Vite + proxy config
│   ├── tailwind.config.ts      # Tailwind + RTL + custom theme
│   ├── components.json         # shadcn/ui config
│   ├── index.html
│   ├── dist/                   # Production build (git-ignored)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # Providers + Routes
│       ├── index.css           # Tailwind + CSS variables
│       ├── lib/
│       │   ├── utils.ts        # cn() helper
│       │   ├── api.ts          # API client functions
│       │   └── arabic-utils.ts # normalize, format helpers
│       ├── hooks/
│       │   ├── use-debounce.ts
│       │   ├── use-geolocation.ts
│       │   ├── use-mosques.ts  # TanStack Query hooks
│       │   ├── use-audio-player.ts
│       │   └── use-favorites.ts
│       ├── context/
│       │   ├── AudioContext.tsx    # Global audio state
│       │   └── FavoritesContext.tsx # localStorage favorites
│       ├── components/
│       │   ├── ui/             # shadcn/ui components
│       │   ├── layout/         # Header, Footer, MobileMenu, ScrollToTop
│       │   ├── mosque/         # MosqueCard, MosqueGrid, FavoriteButton
│       │   ├── search/         # SearchBar, AreaFilter, ProximityButton
│       │   ├── audio/          # AudioButton, FloatingAudioPlayer
│       │   └── seo/            # MetaTags, StructuredData
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── MosqueDetailPage.tsx
│       │   ├── AboutPage.tsx
│       │   └── ContactPage.tsx
│       └── types/
│           └── index.ts        # TypeScript interfaces
├── templates/                  # KEEP: Admin templates only
├── static/                     # KEEP: Audio, images (served by Flask)
│   ├── audio/*.mp3
│   ├── images/
│   ├── css/styles.css          # DEPRECATED: Can be removed
│   └── js/script.js            # DEPRECATED: Can be removed
```

---

## Key Implementation Details

### 1. Flask Integration (app.py)

```python
# Check if React build exists
REACT_BUILD_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
USE_REACT_FRONTEND = os.path.exists(REACT_BUILD_DIR)

def serve_react_app():
    if USE_REACT_FRONTEND:
        return send_from_directory(REACT_BUILD_DIR, "index.html")
    # Fallback to Jinja templates
    return render_template("index.html", areas=areas)

# Public routes serve React
@app.route("/")
def index():
    return serve_react_app()

# Serve React static assets
@app.route("/assets/<path:path>")
def serve_react_assets(path):
    return send_from_directory(os.path.join(REACT_BUILD_DIR, "assets"), path)
```

### 2. Vite Proxy Configuration (vite.config.ts)

```typescript
server: {
  proxy: {
    '/api': { target: 'http://localhost:5002', changeOrigin: true },
    '/static': { target: 'http://localhost:5002', changeOrigin: true },
    '/report-error': { target: 'http://localhost:5002', changeOrigin: true },
  },
},
```

### 3. RTL Support (tailwind.config.ts)

```typescript
import rtl from 'tailwindcss-rtl'

export default {
  plugins: [rtl, animate],
  theme: {
    extend: {
      fontFamily: { tajawal: ['Tajawal', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#0d4b33', dark: '#083524', light: '#e6f2ee' },
        accent: { DEFAULT: '#c4a052', light: '#f2ecd7' },
      },
    },
  },
}
```

### 4. Audio Player (AudioContext.tsx)

- Global audio state with single-track-at-a-time behavior
- Progress tracking with `requestAnimationFrame`
- Seek functionality
- Track info (mosque name, imam name) for floating player

### 5. Favorites System (FavoritesContext.tsx)

- Stored in localStorage under `taraweeh_favorites`
- Array of mosque IDs
- Persists across sessions

---

## Features Implemented

### Core Features
- [x] Search with Arabic text normalization (500ms debounce)
- [x] Area filter dropdown
- [x] Proximity sorting (geolocation)
- [x] Audio playback with floating player
- [x] YouTube and Google Maps links
- [x] Error report modal
- [x] SEO (meta tags, structured data)

### Enhancements
- [x] Favorites/bookmarking with localStorage
- [x] Floating audio player bar with seek
- [x] Scroll-to-top button
- [x] Scroll restoration on navigation
- [x] Shimmer skeleton loading
- [x] Staggered card animations
- [x] RTL layout throughout

---

## What to Do with Old Files

### Files to KEEP

| File/Directory | Reason |
|----------------|--------|
| `templates/login.html` | Admin authentication |
| `templates/admin/` | Flask-Admin customization |
| `templates/sitemap.xml` | SEO sitemap template |
| `static/audio/` | Audio files served by Flask |
| `static/images/` | Images (favicon, logo, icons) |

### Files to REMOVE (After Testing)

| File/Directory | Replacement |
|----------------|-------------|
| `templates/index.html` | `frontend/src/pages/HomePage.tsx` |
| `templates/base.html` | `frontend/src/components/layout/Layout.tsx` |
| `templates/about.html` | `frontend/src/pages/AboutPage.tsx` |
| `templates/contact.html` | `frontend/src/pages/ContactPage.tsx` |
| `templates/mosque_detail.html` | `frontend/src/pages/MosqueDetailPage.tsx` |
| `templates/error.html` | Error boundary in React |
| `static/css/styles.css` | `frontend/src/index.css` + Tailwind |
| `static/js/script.js` | React components + hooks |

### Recommended Cleanup Steps

1. **Test thoroughly** in production environment
2. **Keep templates** as backup for 1-2 weeks
3. **Move deprecated files** to `_deprecated/` folder:
   ```bash
   mkdir -p _deprecated/templates _deprecated/static
   mv templates/index.html templates/base.html templates/about.html \
      templates/contact.html templates/mosque_detail.html \
      _deprecated/templates/
   mv static/css/styles.css static/js/script.js _deprecated/static/
   ```
4. **Delete after confirmed working**

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Flask API
cd riyadh_taraweeh
python app.py  # Runs on port 5002

# Terminal 2: Vite dev server
cd frontend
npm run dev    # Runs on port 5173
```

Visit `http://localhost:5173` for hot-reload development.

### Building for Production

```bash
cd frontend
npm run build  # Creates dist/ folder
```

Flask will automatically detect and serve from `frontend/dist/`.

### Deploying to Heroku

The root `package.json` contains:
```json
{
  "scripts": {
    "heroku-postbuild": "cd frontend && npm ci && npm run build"
  }
}
```

Heroku will:
1. Detect Node.js and Python buildpacks
2. Run `npm install` at root
3. Run `heroku-postbuild` to build React
4. Start Flask with Gunicorn

---

## Troubleshooting

### Audio not playing
- Check browser console for errors
- Verify `/static/audio/*.mp3` files exist
- Ensure Vite proxy is configured for `/static`

### Icons/images not showing
- Images must be in `/static/images/`
- Vite must proxy `/static` to Flask
- Use absolute paths: `/static/images/filename.svg`

### Favorites not persisting
- Check localStorage in DevTools
- Look for `taraweeh_favorites` key
- Ensure no privacy/incognito mode blocking storage

### TypeScript errors
- Run `npm run build` to see all errors
- Check imports use `@/` alias correctly
- Verify all components export properly from index files

---

## Future Improvements (Phase 2)

- [ ] Add 404 page for unknown routes
- [ ] Add filtering by favorites only
- [ ] Add audio playlist / queue feature
- [ ] Add PWA support (offline, installable)
- [ ] Add react-snap for pre-rendering SEO pages
- [ ] Add automated tests (Vitest + Testing Library)
- [ ] Add Sentry error tracking
- [ ] Performance optimization (lazy loading, code splitting)

---

## Key Files Reference

| Purpose | File |
|---------|------|
| App entry | `frontend/src/App.tsx` |
| Routes | `frontend/src/App.tsx` (Routes component) |
| API calls | `frontend/src/lib/api.ts` |
| Type definitions | `frontend/src/types/index.ts` |
| Global styles | `frontend/src/index.css` |
| Tailwind config | `frontend/tailwind.config.ts` |
| Vite config | `frontend/vite.config.ts` |
| Flask integration | `app.py` (search for `REACT_BUILD_DIR`) |
