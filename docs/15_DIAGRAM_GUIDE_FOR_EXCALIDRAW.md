# Diagram Guide for Excalidraw

> **Purpose:** Descriptions of diagrams to draw manually in Excalidraw (or similar tool).
> Each section describes one diagram with enough detail to recreate it visually.

---

## Diagram 1: Entity Relationship Diagram (ER)

### What to Draw

7 tables with their columns, connected by foreign key relationships.

### Tables

**mosque** (green header)
- id (PK, bold)
- name (varchar 100, NOT NULL)
- location (varchar 200, NOT NULL)
- area (varchar 50, NOT NULL)
- map_link (varchar 500)
- latitude (float, nullable)
- longitude (float, nullable)

**imam** (green header)
- id (PK, bold)
- name (varchar 100, NOT NULL)
- mosque_id (FK → mosque.id, nullable)
- audio_sample (varchar 500)
- youtube_link (varchar 500)

**public_user** (blue header)
- id (PK, bold)
- firebase_uid (varchar 128, UNIQUE, INDEXED)
- username (varchar 50, UNIQUE)
- display_name (varchar 100)
- avatar_url (varchar 500)
- email (varchar 255)
- phone (varchar 20)
- contribution_points (int, default 0)
- created_at (datetime)

**user_favorite** (blue header)
- id (PK, bold)
- user_id (FK → public_user.id)
- mosque_id (FK → mosque.id)
- added_at (datetime)
- UNIQUE(user_id, mosque_id)

**taraweeh_attendance** (blue header)
- id (PK, bold)
- user_id (FK → public_user.id)
- night (int 1-30)
- mosque_id (FK → mosque.id, nullable)
- rakaat (int, nullable)
- attended_at (datetime)
- UNIQUE(user_id, night)

**imam_transfer_request** (orange header)
- id (PK, bold)
- submitter_id (FK → public_user.id)
- mosque_id (FK → mosque.id)
- current_imam_id (FK → imam.id, nullable)
- new_imam_id (FK → imam.id, nullable)
- new_imam_name (varchar 100)
- notes (varchar 500)
- status (varchar 20: pending/approved/rejected)
- reject_reason (varchar 500)
- created_at (datetime)
- reviewed_at (datetime)
- reviewed_by (FK → user.id)
- INDEX(submitter_id, mosque_id, status)

**user** (red header, admin only)
- id (PK, bold)
- username (varchar 50, UNIQUE)
- password_hash (varchar 255)

### Relationships (arrows)

```
imam.mosque_id ──────────────→ mosque.id (many-to-one, dashed for nullable)
user_favorite.user_id ───────→ public_user.id (many-to-one)
user_favorite.mosque_id ─────→ mosque.id (many-to-one)
taraweeh_attendance.user_id ─→ public_user.id (many-to-one)
taraweeh_attendance.mosque_id → mosque.id (many-to-one, dashed)
imam_transfer_request.submitter_id ──→ public_user.id
imam_transfer_request.mosque_id ─────→ mosque.id
imam_transfer_request.current_imam_id → imam.id (dashed)
imam_transfer_request.new_imam_id ───→ imam.id (dashed)
imam_transfer_request.reviewed_by ───→ user.id (dashed)
```

### Layout Suggestion

```
[mosque] ←──── [imam]
   ↑
   ├── [user_favorite] ──→ [public_user]
   ├── [taraweeh_attendance] ──→ [public_user]
   └── [imam_transfer_request] ──→ [public_user]
                                      ↓
                              [user (admin)] ←─ reviewed_by
```

---

## Diagram 2: Request Flow Diagram

### What to Draw

A horizontal flow showing how different URL patterns are routed.

### Components

**Left:** Browser (rectangle)
**Middle:** Heroku Load Balancer → Gunicorn → Flask (3 nested boxes)
**Right:** 5 destination boxes

### Flow Arrows

```
Browser ──→ Heroku LB ──→ Gunicorn ──→ Flask
                                         │
                    ┌────────────────────┤
                    │                    │
              /api/* ──→ [JSON API] ──→ [PostgreSQL]
                    │
           /static/* ──→ [Static Files] (audio, images)
                    │
            /admin/* ──→ [Flask-Admin] (Jinja2 templates)
                    │
           /assets/* ──→ [Vite Bundles] (JS/CSS, immutable cache)
                    │
            /* other ──→ [React SPA] (frontend/dist/index.html)
                              │
                              └──→ Meta tag injection (per-route SEO)
```

### External Services (connected to Flask box)

- PostgreSQL (bottom left)
- AWS S3 (bottom center) — for audio uploads/serving
- Firebase Auth (bottom right) — for token verification
- Gmail SMTP (bottom far right) — for error report emails

---

## Diagram 3: Audio Processing Flow

### What to Draw

Two parallel flows: Upload and Playback.

### Upload Flow (Admin)

```
[Admin] ──→ [Flask-Admin Form]
                │
                ▼
         File upload or URL?
           │           │
           ▼           ▼
     [Upload to S3]  [Store URL]
           │           │
           ▼           ▼
     S3 returns URL    │
           │           │
           └─────┬─────┘
                 ▼
          [imam.audio_sample = URL]
                 │
                 ▼
          [Clear API cache]
```

### Playback Flow (User)

```
[User taps play on MosqueCard]
         │
         ▼
  [AudioContext.play(track)]
         │
         ▼
  Resolve URL:
    http... → use as-is (S3)
    /static/... → use as-is (local)
    other → /static/audio/{filename}
         │
         ▼
  [new Audio(resolvedUrl)]
         │
         ├─→ onloadedmetadata → set duration
         ├─→ oncanplay → isLoading=false
         ├─→ requestAnimationFrame → update progress bar
         │
         ▼
  [FloatingAudioPlayer appears]
    - Play/Pause button
    - Seeking via Radix Slider
    - Mosque name + Imam name
    - Time display
         │
         ▼
  [onended] → stop, hide player
```

### Service Worker Cache Layer

```
Browser ──→ SW intercepts ──→ Cache hit? ──→ Return cached
                                    │
                                    ▼ (miss)
                              Fetch from server/S3
                                    │
                                    ▼
                              Cache response
                                    │
                                    ▼
                              Return to browser
```

---

## Diagram 4: Imam Transfer State Machine

### What to Draw

A state diagram with 3 states and transitions.

### States

- **Pending** (yellow circle) — initial state
- **Approved** (green circle) — terminal
- **Rejected** (red circle) — terminal

### Transitions

```
         User submits
              │
              ▼
        ┌──────────┐
        │ PENDING  │─────── User cancels ──→ [DELETED] (removed from DB)
        └────┬─────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐    ┌──────────┐
│ APPROVED │    │ REJECTED │
└──────────┘    └──────────┘
```

### Side Effects (annotate on arrows)

**User submits →  Pending:**
- Record created in DB
- current_imam_id snapshot taken

**Pending → Approved:**
- Old imam.mosque_id = NULL
- New imam.mosque_id = mosque.id (or new Imam created)
- submitter.contribution_points += 1
- Cache invalidated

**Pending → Rejected:**
- reject_reason stored
- No imam changes
- No points

**Pending → Deleted:**
- Hard delete from DB
- No side effects

---

## Diagram 5: Admin Moderation Flow

### What to Draw

Swimlane diagram with 3 lanes: User, System, Admin.

```
┌─────────────────┬──────────────────────┬─────────────────────┐
│      USER       │       SYSTEM         │       ADMIN         │
├─────────────────┼──────────────────────┼─────────────────────┤
│                 │                      │                     │
│ Tap "تغيّر؟"    │                      │                     │
│ on mosque page  │                      │                     │
│       │         │                      │                     │
│       ▼         │                      │                     │
│ Search imam     │                      │                     │
│       │         │                      │                     │
│       ▼         │                      │                     │
│ Submit transfer ──→ Create record      │                     │
│                 │   status="pending"   │                     │
│                 │   Validate:          │                     │
│                 │   - mosque exists    │                     │
│                 │   - no duplicate     │                     │
│                 │   - imam specified   │                     │
│                 │         │            │                     │
│ View in profile │←── Store in DB       │                     │
│ (pending badge) │                      │                     │
│                 │                      │ See in /admin/      │
│                 │                      │ transfer list       │
│                 │                      │       │             │
│                 │                      │       ▼             │
│                 │                      │ Review submission   │
│                 │                      │       │             │
│                 │                      │  ┌────┴────┐        │
│                 │                      │  ▼         ▼        │
│                 │   Update imam ←───── │ Approve  Reject     │
│                 │   Award point        │  │         │        │
│                 │   Clear cache        │  │    Add reason     │
│                 │         │            │  │         │        │
│ See approved ←──│── Update status ←────│──┘         │        │
│ badge on profile│                      │            │        │
│ (+1 point)      │                      │            │        │
│                 │                      │            │        │
│ See rejected ←──│── Update status ←────│────────────┘        │
│ badge + reason  │                      │                     │
└─────────────────┴──────────────────────┴─────────────────────┘
```

---

## Diagram 6: Deployment Topology

### What to Draw

Infrastructure diagram showing all deployed services.

### Components

```
┌─────────────────────────────────────────────────┐
│                    GITHUB                         │
│            git push origin main                   │
└────────────────────┬────────────────────────────┘
                     │ manual git push
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  HEROKU STAGING  │   │ HEROKU PRODUCTION│
│  riyadh-taraweeh │   │ riyadh-taraweeh  │
│  -staging        │   │ -eu              │
├──────────────────┤   ├──────────────────┤
│ Buildpack 1:     │   │ Buildpack 1:     │
│ Node.js (build)  │   │ Node.js (build)  │
│ Buildpack 2:     │   │ Buildpack 2:     │
│ Python (runtime) │   │ Python (runtime) │
├──────────────────┤   ├──────────────────┤
│ web: gunicorn    │   │ web: gunicorn    │
│      app:app     │   │      app:app     │
├──────────────────┤   ├──────────────────┤
│ PostgreSQL       │   │ PostgreSQL       │
│ (staging DB)     │   │ (production DB)  │
└──────────────────┘   └──────────────────┘
          │                     │
          └──────────┬──────────┘
                     │ both connect to:
                     ▼
          ┌──────────────────┐
          │     AWS S3       │
          │ imams-riyadh-    │
          │ audio (us-east-1)│
          └──────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌──────────────────┐   ┌──────────────────┐
│  FIREBASE AUTH   │   │    GMAIL SMTP    │
│  (Google Cloud)  │   │  smtp.gmail.com  │
│  - Google Sign-in│   │  (error reports) │
│  - Phone OTP     │   │                  │
│  - Token verify  │   │                  │
└──────────────────┘   └──────────────────┘
```

### User's Browser (client-side services)

```
┌─────────────────────────────────────┐
│          USER'S BROWSER             │
├─────────────────────────────────────┤
│ React SPA (served by Flask)         │
│   │                                 │
│   ├─→ Firebase Auth SDK (client)    │
│   │     signIn, signOut, getToken   │
│   │                                 │
│   ├─→ Google Maps JS API            │
│   │     Map rendering, markers      │
│   │                                 │
│   ├─→ Sentry SDK                    │
│   │     Error tracking (production) │
│   │                                 │
│   └─→ Service Worker (Workbox)      │
│         Offline caching, PWA        │
└─────────────────────────────────────┘
```

---

## Diagram 7: Frontend Component Tree

### What to Draw

Tree diagram showing React component hierarchy for the main user flows.

### Root Level

```
<App>
  ├── <Layout>
  │     ├── <Header>
  │     │     ├── <MobileMenu />
  │     │     ├── <LoginDialog />
  │     │     ├── <UsernameSetup />
  │     │     └── <UserMenu />
  │     │
  │     ├── <main>  (routes below)
  │     │
  │     ├── <Footer />
  │     └── <ScrollToTop />
  │
  ├── <FloatingAudioPlayer />  (fixed, z-50)
  └── <Toaster />  (sonner notifications)
```

### Route: Home Page

```
<HomePage>
  ├── <MetaTags />
  ├── <HeroBanner />
  ├── <SearchBar />
  ├── <AreaFilter />
  ├── <LocationFilter />  (dynamic based on area)
  ├── <ProximityButton />
  ├── <FavoritesFilterButton />
  ├── <LocationPermissionModal />
  └── <MosqueGrid>
        ├── <MosqueCard>  (×N, React.memo)
        │     ├── <FavoriteButton />
        │     ├── <ShareButton />
        │     ├── <DistanceBadge />  (if proximity sorted)
        │     └── <AudioRow />  (play/pause + soundbars)
        ├── "عرض المزيد" button
        └── "عرض الكل" button
```

### Route: Mosque Detail

```
<MosqueDetailPage>
  ├── <MetaTags />  (dynamic per mosque)
  ├── <StickyHeader>
  │     └── <FavoriteButton />
  ├── <DescriptionSection />
  ├── <InformationGrid>
  │     ├── <LocationRow />
  │     ├── <AreaRow />
  │     ├── <ImamRow />  (+ "تغيّر؟" button)
  │     ├── <AudioRow />  (full-width tappable)
  │     └── <MapLinkRow />
  ├── <GoogleMapsEmbed />  (iframe)
  ├── <MobileActionBar />  (fixed bottom)
  ├── <TransferDialog />  (lazy-loaded)
  ├── <ErrorReportModal />
  └── <LoginDialog />  (if needed)
```

---

## Diagram 8: Authentication Flow

### What to Draw

Sequence diagram with 4 participants: User, React App, Firebase, Flask API.

```
User          React App        Firebase         Flask API
 │                │                │                │
 │  Click login   │                │                │
 │───────────────>│                │                │
 │                │                │                │
 │                │  signInWith    │                │
 │                │  Google()      │                │
 │                │───────────────>│                │
 │                │                │                │
 │  Google popup  │                │                │
 │<───────────────│<───────────────│                │
 │                │                │                │
 │  Select account│                │                │
 │───────────────>│───────────────>│                │
 │                │                │                │
 │                │  Firebase user │                │
 │                │<───────────────│                │
 │                │                │                │
 │                │  getIdToken()  │                │
 │                │───────────────>│                │
 │                │  token         │                │
 │                │<───────────────│                │
 │                │                │                │
 │                │         GET /api/auth/me        │
 │                │  (Bearer token)                 │
 │                │────────────────────────────────>│
 │                │                │                │
 │                │                │  verify_id_    │
 │                │                │<──token()──────│
 │                │                │  valid         │
 │                │                │───────────────>│
 │                │                │                │
 │                │         200 or 404              │
 │                │<────────────────────────────────│
 │                │                │                │
 │  [if 404]      │                │                │
 │  Show username │                │                │
 │  setup dialog  │                │                │
 │<───────────────│                │                │
 │                │                │                │
 │  Enter username│                │                │
 │───────────────>│                │                │
 │                │      POST /api/auth/register    │
 │                │────────────────────────────────>│
 │                │         201 user profile        │
 │                │<────────────────────────────────│
 │                │                │                │
 │  Logged in!    │                │                │
 │<───────────────│                │                │
```

---

## Diagram 9: Favorites Sync Flow

### What to Draw

Flow diagram showing optimistic update pattern.

```
┌──────────────────────────────────────────────────┐
│ AUTHENTICATED USER                                │
│                                                   │
│  Tap heart ──→ setOptimistic(add) ──→ UI updates │
│       │                                  │        │
│       ▼                                  │        │
│  POST /api/user/favorites/{id}           │        │
│       │                                  │        │
│   ┌───┴───┐                              │        │
│   ▼       ▼                              │        │
│ 200 OK  Error                            │        │
│   │       │                              │        │
│   │       ▼                              │        │
│   │  Rollback optimistic state           │        │
│   │  Show toast error                    │        │
│   │                                      │        │
│   ▼                                      │        │
│ Keep state ──────────────────────────────┘        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ UNAUTHENTICATED USER                              │
│                                                   │
│  Tap heart ──→ localStorage.pendingFavorite = id │
│       │                                           │
│       ▼                                           │
│  Show LoginDialog                                 │
│       │                                           │
│       ▼                                           │
│  User logs in                                     │
│       │                                           │
│       ▼                                           │
│  AuthContext checks pendingFavorite               │
│       │                                           │
│       ▼                                           │
│  POST /api/user/favorites/{id}                   │
│       │                                           │
│       ▼                                           │
│  Remove pendingFavorite from localStorage         │
└──────────────────────────────────────────────────┘
```

---

## Diagram 10: Progressive Reveal (MosqueGrid)

### What to Draw

Stepped diagram showing how mosque cards are revealed.

```
Initial Load:
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │ │ 3 │ │ 4 │  ← visible (animated entrance)
└───┘ └───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 5 │ │ 6 │ │ 7 │ │ 8 │  ← visible (animated entrance)
└───┘ └───┘ └───┘ └───┘
         [عرض المزيد (8)]
         [عرض الكل (110)]

After "عرض المزيد":
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │ │ 3 │ │ 4 │  ← already visible
└───┘ └───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 5 │ │ 6 │ │ 7 │ │ 8 │  ← already visible
└───┘ └───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 9 │ │10 │ │11 │ │12 │  ← NEW (fade-in-up animation)
└───┘ └───┘ └───┘ └───┘
┌───┐ ┌───┐ ┌───┐ ┌───┐
│13 │ │14 │ │15 │ │16 │  ← NEW (fade-in-up animation)
└───┘ └───┘ └───┘ └───┘
         [عرض المزيد (8)]
         [عرض الكل (102)]

Filter/Search change → Reset to 8 visible
```
