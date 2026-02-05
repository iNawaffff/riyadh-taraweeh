# Staging Changelog — Performance, Security & Testing

Covers all uncommitted changes on `main` being pushed to the `staging` remote.

---

## 1. Performance — Backend

### 1a. N+1 Query Elimination (4 endpoints)

Every mosque listing endpoint previously ran a separate `SELECT` for each imam inside a Python loop — ~119 extra queries per request. All four endpoints now use a single `outerjoin` query.

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /api/mosques` | 1 + N queries (N = mosque count) | 1 joined query |
| `GET /api/mosques/search` | 1 + N (joined for filter, re-queried for serialization) | 1 joined query carried through filter + serialization |
| `GET /api/mosques/nearby` | 1 + N | 1 joined query, geodesic calc on tuples |
| `GET /api/u/<username>` | N favorites × 2 (Mosque + Imam per fav) | 1 `IN` + join query |

**Pattern used:**

```python
pairs = (
    db.session.query(Mosque, Imam)
    .outerjoin(Imam, Imam.mosque_id == Mosque.id)
    .order_by(Mosque.name)
    .all()
)
result = [serialize_mosque(m, imam=i) for m, i in pairs]
```

The existing `serialize_mosque()` helper already accepted an optional `imam=` kwarg — passing it skips the internal fallback query.

**Files:** `app.py` — `/api/mosques` (~line 716), `/api/mosques/search` (~line 752), `/api/mosques/nearby` (~line 927), `/api/u/<username>` (~line 1074)

### 1b. Response Compression (`flask-compress`)

Added `flask-compress==1.17` which handles gzip/brotli content negotiation at the WSGI layer. Particularly impactful for the `/api/mosques` JSON response (~80 KB uncompressed → ~8 KB gzipped).

```python
from flask_compress import Compress
app.config['COMPRESS_MIN_SIZE'] = 500
Compress(app)
```

Responses smaller than 500 bytes are left uncompressed (overhead not worth it).

**Files:** `app.py` (import + init), `requirements.txt` (+1 dependency)

### 1c. Server-side API Response Cache

Added a module-level `_api_response_cache` dict that caches:

- `/api/mosques` — full mosque list (keyed as `"mosques"`)
- `/api/locations` — location/area lists (keyed as `"locations:<area>"` or `"areas"`)

Invalidation happens at the same 3 code paths that already clear `_imam_index_cache`:

1. `MosqueModelView.after_model_change()` — admin edits a mosque/imam
2. `TransferRequestModelView.action_approve()` — bulk approve transfers
3. `approve_transfer()` — single transfer approval via API

Data changes only when an admin modifies mosque/imam records (~once/day during Ramadan). Heroku dyno restarts also clear the cache naturally.

**File:** `app.py` — cache declaration (~line 1286), usage in `get_mosques()` and `get_locations()`, invalidation at 3 sites

### 1d. HTTP Cache Headers (`@after_request`)

Added an `@app.after_request` hook that sets `Cache-Control` headers based on URL path:

| Path Pattern | Cache-Control | Rationale |
|-------------|--------------|-----------|
| `/assets/*` | `public, max-age=31536000, immutable` | Vite adds content hashes to filenames — safe to cache forever |
| `/static/images/*` | `public, max-age=2592000` (30 days) | Logos, icons — rarely change |
| `/static/audio/*` | `public, max-age=604800` (7 days) | Audio samples — stable within season |
| `/sw.js`, `/registerSW.js` | `public, max-age=0, must-revalidate` | Service Worker spec requires freshness checks |
| `/manifest.webmanifest` | `public, max-age=86400` (1 day) | PWA manifest — infrequent changes |

**File:** `app.py` — `add_cache_headers()` function near end of file

---

## 2. Performance — Frontend

### 2a. React Query `gcTime` (Garbage Collection)

Added `gcTime: 30 * 60 * 1000` (30 minutes) to the global `QueryClient` defaults. Previously only `staleTime` was set (5 min), meaning cached data was garbage-collected quickly. Now cached responses survive in memory for 30 minutes, reducing redundant fetches during a single session.

**File:** `frontend/src/App.tsx`

### 2b. `MosqueCard` Memoization

Wrapped `MosqueCard` with `React.memo()` to prevent unnecessary re-renders when parent list state changes but individual card props haven't changed. This is meaningful because the homepage renders 100+ cards.

**File:** `frontend/src/components/mosque/MosqueCard.tsx`

### 2c. PWA Cache for S3 Audio

The existing Workbox config cached `/static/audio/*` but missed S3-hosted audio files at `https://imams-riyadh-audio.s3.*.amazonaws.com/audio/*`. Added a new `runtimeCaching` entry:

```typescript
{
  urlPattern: /^https:\/\/imams-riyadh-audio\.s3\.[\w-]+\.amazonaws\.com\/audio\/.*/i,
  handler: 'CacheFirst',
  options: {
    cacheName: 's3-audio-cache',
    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
    cacheableResponse: { statuses: [0, 200] },
    rangeRequests: true,  // Required for audio seeking
  },
}
```

- `CacheFirst` — audio files are immutable once uploaded
- `rangeRequests: true` — enables seeking within cached audio (HTTP Range headers)
- 50 entries / 7 days — reasonable for a user's listened recitations

**File:** `frontend/vite.config.ts`

---

## 3. Security

### 3a. Session Cookie Hardening

```python
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("FLASK_ENV") != "development"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
```

- `Secure` — cookies only sent over HTTPS (disabled in local dev)
- `HttpOnly` — prevents JavaScript access to session cookie (XSS mitigation)
- `SameSite=Lax` — prevents CSRF via cross-origin navigation while allowing normal link follows

**File:** `app.py` (after `SECRET_KEY` config)

### 3b. Reverse Proxy Trust (`ProxyFix`)

```python
from werkzeug.middleware.proxy_fix import ProxyFix
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
```

On Heroku, the app sits behind a load balancer. Without `ProxyFix`, Flask sees the internal LB IP instead of the real client IP, and `request.url` uses `http://` instead of `https://`. This fix trusts 1 level of `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`.

Impact: rate limiter (`flask-limiter`) now correctly identifies unique clients, and `url_for(_external=True)` generates correct HTTPS URLs.

**File:** `app.py` (right after `app = Flask(...)`)

### 3c. Firebase Token Revocation Checks

```python
from firebase_admin.auth import RevokedIdTokenError, CertificateFetchError

decoded = firebase_auth.verify_id_token(token, check_revoked=True)
```

Previously, `verify_id_token()` was called without `check_revoked=True`. This meant a user who signed out or had their account disabled could still use their old token until it naturally expired (up to 1 hour). Now:

- `check_revoked=True` — hits Firebase to verify the token hasn't been revoked
- `RevokedIdTokenError` → 401 with clear message to re-authenticate
- `CertificateFetchError` → 503 (Firebase service temporarily unavailable, not user's fault)

Applied in both `firebase_auth_required` and `firebase_auth_optional` decorators.

**File:** `app.py` (both auth decorators)

### 3d. Rate Limiting on Previously Unprotected Endpoints

Added `@limiter.limit()` decorators to endpoints that were previously unlimited:

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `GET /api/mosques/search` | 30/min | Prevents search abuse / scraping |
| `GET /api/mosques/nearby` | 20/min | Geolocation queries are heavier (geodesic math) |
| `GET /api/imams/search` | 30/min | Fuzzy search is CPU-intensive |
| `POST /api/transfers` | 10/min | Prevents spam transfer requests |
| `POST /report-error` | 3/min | Prevents email flooding |

**File:** `app.py`

---

## 4. UI Skeleton Screens

Replaced generic `<PageLoader />` spinner with layout-matching skeleton screens on two pages. This eliminates layout shift (CLS) and gives users a sense of structure before data loads.

### 4a. Map Page Skeleton

Replaced `<PageLoader />` with a skeleton that matches the map layout:

- Top toolbar: `Skeleton` rectangle for the back button + label
- Map area: full-height `bg-muted` placeholder matching the map viewport

**File:** `frontend/src/pages/MapPage.tsx`

### 4b. Profile Page Skeleton

Replaced `<PageLoader />` with a multi-section skeleton:

- **Hero section:** avatar circle + name + username + share button skeletons, all using `bg-white/10` to blend with the dark gradient background
- **Stats cards:** 3 cards matching the real stat cards (icon circle + number + label)
- **Content area:** card with heading + progress bar skeletons

**File:** `frontend/src/pages/ProfilePage.tsx`

### 4c. Profile Contribution Points Default

Changed `profile.contribution_points` to `profile.contribution_points ?? 0` to prevent `undefined` rendering when the field is missing from older user records.

**File:** `frontend/src/pages/ProfilePage.tsx`

---

## 5. Auth UX Improvements

### 5a. Login Dialog — Expanded Error Map

Added 3 new Firebase error codes to the user-facing Arabic error map:

| Code | Message |
|------|---------|
| `auth/popup-blocked` | المتصفح منع النافذة المنبثقة، اسمح بالنوافذ المنبثقة وحاول مرة أخرى |
| `auth/popup-closed-by-user` | تم إغلاق نافذة تسجيل الدخول |
| `auth/network-request-failed` | تعذر الاتصال بالإنترنت، حاول مرة أخرى |

### 5b. Login Dialog — Silent Error Handling

`auth/cancelled-popup-request` (fires when user rapidly clicks Google sign-in, triggering multiple popups) is now silently ignored instead of showing an error.

The `getFirebaseError()` function now returns `null` for silent errors, and all catch blocks check `if (msg) setError(msg)`.

**File:** `frontend/src/components/auth/LoginDialog.tsx`

### 5c. Phone Auth — Timeout for reCAPTCHA

Added a `withTimeout()` wrapper around `signInWithPhoneNumber()` that rejects after 15 seconds with a user-friendly Arabic message. This handles the case where reCAPTCHA hangs silently (common with ad blockers or corporate firewalls).

```typescript
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ])
}
```

**File:** `frontend/src/lib/firebase.ts`

---

## 6. Testing Infrastructure

### 6a. Backend — pytest

**New files:**

- `requirements-dev.txt` — pulls in main requirements + `pytest==8.3.4` + `pytest-flask==1.3.0`
- `tests/__init__.py` — package marker
- `tests/conftest.py` — shared fixtures:
  - SQLite in-memory DB override (no PostgreSQL needed for tests)
  - Auto `create_all()` / `drop_all()` per test
  - Seed data: 1 mosque, 1 imam, 3 users (varying contribution points)
- `tests/test_leaderboard.py` — 3 tests:
  - Atomic `contribution_points` increment via SQL column expression
  - Leaderboard returns users ordered by points descending
  - Zero-point users are excluded from leaderboard

**Run:** `pip install -r requirements-dev.txt && pytest tests/`

### 6b. Frontend — Playwright E2E

**New files:**

- `frontend/playwright.config.ts` — config for Desktop Chrome + Mobile Safari, Arabic locale, Riyadh timezone, auto-starts dev server
- `frontend/e2e/login-dialog.spec.ts` — 3 tests:
  - Login dialog opens and shows Google + phone options
  - Navigating to phone input mode shows number input, country code, and send button
  - Phone number validation: button disabled for empty/short input, enabled for valid 9-digit Saudi number

**New scripts in `package.json`:**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

**New devDependency:** `@playwright/test@^1.52.0`

**Run:** `cd frontend && npx playwright install && npm run test:e2e`

---

## Files Changed

| File | Category | Summary |
|------|----------|---------|
| `app.py` | Perf, Security | N+1 fixes, compression, cache headers, API cache, session hardening, ProxyFix, token revocation, rate limits |
| `requirements.txt` | Perf | +`flask-compress==1.17` |
| `requirements-dev.txt` | Tests | New: pytest + pytest-flask |
| `tests/__init__.py` | Tests | New: package marker |
| `tests/conftest.py` | Tests | New: shared fixtures + seed data |
| `tests/test_leaderboard.py` | Tests | New: leaderboard endpoint tests |
| `frontend/vite.config.ts` | Perf | S3 audio PWA cache entry |
| `frontend/package.json` | Tests | Playwright scripts + devDep |
| `frontend/playwright.config.ts` | Tests | New: Playwright config |
| `frontend/e2e/login-dialog.spec.ts` | Tests | New: login dialog E2E tests |
| `frontend/src/App.tsx` | Perf | `gcTime` for React Query |
| `frontend/src/components/mosque/MosqueCard.tsx` | Perf | `React.memo()` wrap |
| `frontend/src/components/auth/LoginDialog.tsx` | Auth UX | Error map, silent errors |
| `frontend/src/lib/firebase.ts` | Auth UX | `withTimeout` for reCAPTCHA |
| `frontend/src/pages/MapPage.tsx` | UI | Skeleton loading screen |
| `frontend/src/pages/ProfilePage.tsx` | UI | Skeleton loading screen, null-safe contribution count |

---

## Verification Checklist

- [ ] **N+1 fix:** Set `SQLALCHEMY_ECHO=True`, hit `GET /api/mosques` — should see 1 SELECT with JOIN, not 119 queries
- [ ] **Compression:** `curl -H "Accept-Encoding: gzip" -v localhost:5002/api/mosques` — check `Content-Encoding: gzip`
- [ ] **Cache headers:** `curl -v localhost:5002/assets/index-*.js` — check `Cache-Control: public, max-age=31536000, immutable`
- [ ] **API cache:** Hit `GET /api/mosques` twice — second call should produce 0 SQL queries
- [ ] **PWA S3 audio:** Play an S3 audio file → DevTools > Application > Cache Storage → verify `s3-audio-cache` entry
- [ ] **Session cookies:** Check response `Set-Cookie` header includes `Secure; HttpOnly; SameSite=Lax`
- [ ] **Rate limits:** Rapid-fire `GET /api/mosques/search` > 30 times in 1 min → expect 429
- [ ] **Token revocation:** Sign out on another device, reuse old token → expect 401 with revocation message
- [ ] **Skeleton screens:** Navigate to `/map` and profile pages — skeletons should appear before data loads
- [ ] **Login dialog:** Open login, try Google sign-in with popup blocked → expect Arabic popup-blocked error
- [ ] **Phone timeout:** Block reCAPTCHA domain, try phone sign-in → expect timeout message after 15s
- [ ] **Backend tests:** `pip install -r requirements-dev.txt && pytest tests/ -v`
- [ ] **E2E tests:** `cd frontend && npx playwright install && npm run test:e2e`
- [ ] **Build:** `cd frontend && npm run build` — no errors
