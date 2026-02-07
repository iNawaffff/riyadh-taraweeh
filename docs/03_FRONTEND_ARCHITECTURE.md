# Frontend Architecture

> **Source of truth:** `frontend/src/` directory
> **Framework:** React 19 + TypeScript, Vite 7, Tailwind CSS 3.4

---

## Provider Hierarchy (App.tsx)

The app wraps all routes in a nested provider stack. Order matters — inner providers can access outer ones.

```
<Sentry.ErrorBoundary>            ← Catches unhandled errors (production)
  <HelmetProvider>                 ← SEO meta tag management
    <QueryClientProvider>          ← TanStack Query (server state)
      <AuthProvider>               ← Firebase auth state
        <FavoritesProvider>        ← Favorites (depends on Auth)
          <AudioProvider>          ← Global audio player state
            <TooltipProvider>      ← Radix UI tooltips (300ms delay)
              <BrowserRouter>      ← Client-side routing
                <DirectionProvider dir="rtl">  ← RTL for Radix components
                  <Routes />
                  <FloatingAudioPlayer />
                  <Toaster />
                </DirectionProvider>
              </BrowserRouter>
            </TooltipProvider>
          </AudioProvider>
        </FavoritesProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
</Sentry.ErrorBoundary>
```

---

## Routing Configuration

All pages are lazy-loaded with `React.lazy()` + `<Suspense fallback={<PageLoader />}>`.

| Path | Component | Auth Required | Description |
|------|-----------|--------------|-------------|
| `/` | HomePage | No | Search, filter, browse mosques |
| `/mosque/:id` | MosqueDetailPage | No | Individual mosque with audio, map, transfer |
| `/favorites` | FavoritesPage | Yes | User's favorited mosques |
| `/tracker` | TrackerPage | Yes | 30-night Ramadan attendance |
| `/leaderboard` | LeaderboardPage | No | Top contributors ranking |
| `/map` | MapPage | No | Google Maps with all mosques |
| `/about` | AboutPage | No | Project information |
| `/contact` | ContactPage | No | Contact channels |
| `/makkah` | MakkahSchedulePage | No | Makkah Haram imam schedule |
| `/u/:username` | ProfilePage | No | Public user profile |
| `/request` | RequestPage | Yes | Submit community request (new mosque or imam change) |
| `/my-requests` | MyRequestsPage | Yes | User's request history with status tracking |
| `*` | NotFoundPage | No | 404 fallback |

All routes are wrapped in `<Layout>` which provides Header + Footer + ScrollToTop.

---

## State Management Architecture

### Three Layers of State

```
┌─────────────────────────────────────────────────────┐
│  1. SERVER STATE (TanStack Query)                    │
│     - Mosque data, search results, nearby results    │
│     - Areas, locations (dropdown options)             │
│     - Leaderboard, tracker, community requests       │
│     - Cached with configurable staleTime             │
│     - Auto-refetch on window focus                   │
└─────────────┬───────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────┐
│  2. GLOBAL STATE (React Context)                     │
│     - AuthContext: Firebase user, token, profile     │
│     - FavoritesContext: Optimistic favorite list     │
│     - AudioContext: Current track, progress, seek    │
└─────────────┬───────────────────────────────────────┘
              │
┌─────────────▼───────────────────────────────────────┐
│  3. LOCAL STATE (useState in components)             │
│     - Search query, selected filters                 │
│     - Dialog open/close states                       │
│     - Animation flags, loading states                │
└─────────────────────────────────────────────────────┘
```

### TanStack Query Cache Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 30 * 60 * 1000,       // 30 minutes garbage collection
    },
  },
})
```

| Query | staleTime | Cache Key |
|-------|-----------|-----------|
| All mosques | 5 min | `['mosques']` |
| Search results | 30 sec | `['mosques', 'search', params]` |
| Nearby results | 1 min | `['mosques', 'nearby', params]` |
| Areas | 10 min | `['areas']` |
| Locations | 10 min | `['locations', area]` |
| Imam search | 30 sec | `['imams', 'search', query]` |
| Leaderboard | 5 min | `['leaderboard']` |
| Tracker | default | `['tracker']` |
| User requests | default | `['my-requests']` |
| User transfers (legacy) | default | `['user-transfers']` |

---

## Context Deep Dives

### AuthContext

**Manages:** Firebase authentication state + backend user profile

**Key State:**
```typescript
{
  firebaseUser: FirebaseUser | null    // Raw Firebase user object
  user: PublicUserProfile | null       // Backend profile (username, favorites, etc.)
  token: string | null                 // Firebase ID token for API calls
  isLoading: boolean                   // Auth state loading
  isAuthenticated: boolean             // Has both Firebase user + backend profile
  needsRegistration: boolean           // Firebase user exists but no backend profile
}
```

**Auth Flow:**
```
Firebase signIn → onAuthStateChanged fires
  → Fetch /api/auth/me with token
  → 200: Set user profile → done
  → 404: Set needsRegistration=true → show UsernameSetup dialog
  → UsernameSetup submits → POST /api/auth/register → Set user profile → done
```

**Token Refresh:** Auto-refreshes Firebase ID token every 50 minutes.

### FavoritesContext

**Manages:** Optimistic favorite list synced with server

**Optimistic Update Pattern:**
```
User clicks heart → setOptimistic(add mosqueId) → UI updates instantly
  → POST /api/user/favorites/{mosqueId} in background
  → Success: keep state
  → Error: rollback state + show toast error
```

**Unauthenticated Flow:**
```
User clicks heart → store mosqueId in localStorage('pendingFavorite')
  → Show LoginDialog → User logs in
  → AuthContext checks pendingFavorite → auto-adds to favorites
  → Remove from localStorage
```

### AudioContext

**Manages:** HTML5 Audio element, playback state, progress tracking

**Key State:**
```typescript
{
  currentTrack: { mosqueId, mosqueName, imamName, audioUrl } | null
  isPlaying: boolean
  isLoading: boolean
  progress: number      // 0-100 (percentage)
  duration: number      // seconds
  currentTime: number   // seconds
}
```

**Progress Tracking:** Uses `requestAnimationFrame` loop for smooth progress bar updates (not `timeupdate` event which fires at inconsistent intervals).

**Audio URL Resolution:**
- URLs starting with `http` → use as-is (S3)
- URLs starting with `/static/` → use as-is (local)
- Other → prepend `/static/audio/` (legacy convention)

---

## Component Architecture

### Component Hierarchy (Home Page flow)

```
<Layout>
  <Header>
    <MobileMenu />
    <LoginDialog />
    <UsernameSetup />
    <UserMenu />
  </Header>
  <HomePage>
    <HeroBanner />
    <SearchBar />                    ← 500ms debounced input
    <AreaFilter />                   ← Select: شمال/جنوب/شرق/غرب
    <LocationFilter />               ← Select: neighborhoods (dynamic)
    <ProximityButton />              ← Geolocation sort trigger
    <FavoritesFilterButton />        ← Show favorites only
    <MosqueGrid>                     ← Progressive reveal (8 at a time)
      <MosqueCard>                   ← React.memo optimized
        <FavoriteButton />           ← Heart with pop animation
        <ShareButton />              ← Web Share API / clipboard
        <DistanceBadge />            ← Walking/bicycle/car icon
        <AudioRow />                 ← Play button + soundbars
      </MosqueCard>
      ...
    </MosqueGrid>
  </HomePage>
  <FloatingAudioPlayer />           ← Fixed bottom, z-50
  <Footer />
  <ScrollToTop />
</Layout>
```

### Component Hierarchy (Mosque Detail flow)

```
<MosqueDetailPage>
  <StickyHeader>                     ← Mosque name, imam, area badge
    <FavoriteButton />
  </StickyHeader>
  <DescriptionSection />             ← Collapsible on mobile
  <InformationGrid>
    <LocationRow />
    <AreaRow />
    <ImamRow />                      ← "Change?" button triggers TransferDialog
    <AudioRow />                     ← Full-width tappable play area
    <MapLinkRow />
  </InformationGrid>
  <GoogleMapsEmbed />                ← iframe at mosque coordinates
  <MobileActionBar />                ← Fixed bottom: Maps + YouTube buttons
  <TransferDialog />                 ← Imam change form (submits to community request API)
  <ErrorReportModal />               ← Data correction form
  <LoginDialog />                    ← If unauthenticated tries to transfer
</MosqueDetailPage>
```

---

## Data Flow Diagrams

### Search Flow

```
User types "الراجحي"
  │
  ▼
SearchBar.onChange → setSearchQuery("الراجحي")
  │
  ▼ (500ms debounce)
debouncedQuery = "الراجحي"
  │
  ▼
useSearchMosques({ q: "الراجحي", area, location })
  │
  ▼ TanStack Query
GET /api/mosques/search?q=الراجحي&area=...&location=...
  │
  ▼
Flask: normalize_arabic → filter in Python → return JSON
  │
  ▼
MosqueGrid receives mosques[] → renders MosqueCards
  │
  ▼ Progressive reveal
Show first 8 → "عرض المزيد" button → +8 more → "عرض الكل"
```

### Proximity Sort Flow

```
User clicks "الترتيب حسب الموقع"
  │
  ▼
First time? → Show LocationPermissionModal → User accepts
  │
  ▼
navigator.geolocation.getCurrentPosition()
  │
  ▼ (up to 30s timeout)
Success: { lat: 24.7136, lng: 46.6753 }
  │
  ▼
useNearbyMosques({ lat, lng })
  │
  ▼
GET /api/mosques/nearby?lat=24.7136&lng=46.6753
  │
  ▼
Flask: calculate geodesic distance for each mosque → sort → return
  │
  ▼
MosqueGrid shows with DistanceBadge (٩٨ م, ١.٢ كم, etc.)
  │
  ▼
Green success flash on ProximityButton (2 seconds)
```

### Authentication Flow

```
                    ┌─────────────┐
                    │  LoginDialog │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
       [Google Button]           [Phone Button]
              │                         │
              ▼                         ▼
       Firebase popup            Phone input (Saudi format)
       account selector            │
              │                    ▼
              │              reCAPTCHA (invisible)
              │                    │
              │                    ▼
              │              Firebase sends SMS OTP
              │                    │
              │                    ▼
              │              6-digit OTP input
              │              (auto-submit on 6th digit)
              │                    │
              └────────┬───────────┘
                       ▼
              onAuthStateChanged fires
                       │
                       ▼
              GET /api/auth/me (with token)
                       │
              ┌────────┴────────┐
              ▼                 ▼
           200 OK            404 Not Found
           Set user          needsRegistration = true
           Close dialog            │
                                   ▼
                            UsernameSetup dialog
                                   │
                                   ▼
                            POST /api/auth/register
                                   │
                                   ▼
                            Set user, close dialog
```

---

## Key Components Detail

### MosqueCard (React.memo)

**Why memo?** Prevents re-render when audio context changes (progress updates 60fps). Only re-renders when its own props change.

**Interactive Elements (z-10, stop propagation):**
- Favorite button (heart)
- Share button
- Audio play button
- YouTube link
- Google Maps link
- Entire card is a Link to `/mosque/:id` (stretched-link pattern)

### FloatingAudioPlayer

- Fixed at viewport bottom (`position: fixed, z-50`)
- Radix UI Slider for seeking (accessible, keyboard support)
- Shows: play/pause, mosque name, imam name, time, close
- Safe area padding for iPhone notch
- Slide-in animation from bottom

### MosqueGrid (Progressive Reveal)

- Initially shows 8 mosques
- "عرض المزيد" (Show More) loads +8
- "عرض الكل" (Show All) loads remaining
- New cards animate with `fade-in-up`
- Auto-resets to 8 when search/filter changes

---

## Performance Optimizations

| Optimization | Where | Impact |
|-------------|-------|--------|
| Code splitting | All pages via `React.lazy()` | Smaller initial bundle |
| Manual chunks | vite.config.ts (router, UI, query, firebase, sentry) | Better cache hit rates |
| React.memo | MosqueCard | Prevents 60fps re-renders from audio |
| Debounce | Search input (500ms), imam search (300ms) | Fewer API calls |
| Conditional queries | `enabled` flag on TanStack Query | No unnecessary fetches |
| Lazy Firebase import | `lib/firebase.ts` | Auth code only when needed |
| GPU animations | `transform: scaleY` for soundbars | No layout reflow |
| requestAnimationFrame | Audio progress tracking | Smooth progress bar |
| Service Worker | Workbox with per-resource strategies | Offline support, fast loads |

---

## PWA Configuration (Workbox)

| Resource | Strategy | Cache Name | TTL |
|----------|----------|------------|-----|
| Google Fonts | CacheFirst | google-fonts-cache | 1 year |
| API responses | NetworkFirst | api-cache | 24 hours |
| Images | CacheFirst | images-cache | 30 days |
| Local audio | CacheFirst | audio-cache | 7 days |
| S3 audio | CacheFirst | s3-audio-cache | 7 days |

**Range Request Support:** S3 audio cache handles range requests for seeking without re-downloading.

---

## Styling System

### Tailwind Configuration

- **Font:** Tajawal (Arabic, Google Fonts)
- **Direction:** RTL globally (`direction: rtl` on `*`)
- **Primary:** `#0d4b33` (dark forest green)
- **Accent:** `#c4a052` (gold)
- **Container:** max-width 1200px, centered, 1rem padding
- **Border radius:** 0.625rem default

### CSS Animations (index.css)

| Animation | Duration | Used For |
|-----------|----------|----------|
| soundbar | 0.5–0.8s | Audio visualizer bars |
| playBreath | 2.8s | Play button idle pulse |
| audioRowShimmer | 2s | Hover shimmer on audio row |
| heartPop | 0.5s | Favorite button click |
| heartRing | 0.6s | Favorite ring burst |
| shake | 0.5s | Error state feedback |
| crownBounce | 0.6s | Leaderboard top 3 |
| confettiFall | 1.8–3.3s | First contribution celebration |
| fadeInUp | 0.3s | Card entrance |
| heroFadeIn | 0.6s | Page entrance |

---

## Accessibility Features

- **Skip to main content** link (hidden, visible on focus)
- **ARIA labels** on all interactive elements
- **Focus-visible** rings (2px primary color)
- **Keyboard navigation** in modals (Enter/Escape)
- **Touch targets** minimum 44x44px (h-11, h-12)
- **Safe area padding** for iPhone notch
- **Semantic HTML** (`<main>`, `<nav>`, proper heading hierarchy)
- **Screen reader** support throughout

---

## SEO Implementation

### Server-Side Meta Injection

Flask injects per-route meta tags into the React `index.html` before serving:
- `<title>`, `og:title`, `og:description`, `og:url`
- Dynamic for mosque detail pages (mosque name, imam name)
- Dynamic for user profiles (username)

### Client-Side (react-helmet-async)

- Per-page `<MetaTags>` component
- Structured data (JSON-LD) via `<StructuredData>`
- Global `<BaseStructuredData>` for organization schema

### Sitemap

Generated server-side via Jinja2 template at `/sitemap.xml`:
- Static pages (/, /about, /contact, /map, /favorites, /tracker, /leaderboard, /makkah)
- Dynamic: one entry per mosque (`/mosque/<id>`)

---

## Testing Infrastructure

### Unit Tests (Vitest)

```
frontend/src/test/
├── setup.ts                          # Test setup
├── FavoritesFilterButton.test.tsx    # Component test
└── NotFoundPage.test.tsx             # Page test
```

- Environment: jsdom
- Globals: true (describe, it, expect)
- CSS: true (processes CSS imports)

### E2E Tests (Playwright)

```
frontend/e2e/                         # Test specs
```

- Browsers: Desktop Chrome (1280x720), Mobile Safari (iPhone 14)
- Locale: ar-SA
- Timezone: Asia/Riyadh
- Base URL: http://localhost:5173
