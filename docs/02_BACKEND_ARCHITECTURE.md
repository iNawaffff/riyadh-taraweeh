# Backend Architecture

> **Source of truth:** `app.py` (1631 lines), `models.py` (104 lines), `utils.py` (32 lines)

---

## File Organization

The entire backend lives in **three files**:

| File | Lines | Responsibility |
|------|-------|---------------|
| `app.py` | 1631 | Flask app, ALL routes, admin panel, auth decorators, caching, search, email |
| `models.py` | ~130 | SQLAlchemy models (7 tables) |
| `utils.py` | 32 | Arabic text normalization function |

There is no service layer, no controller separation, no blueprint structure. Everything is in `app.py`.

---

## App Initialization (`app.py` lines 1–250)

### Configuration Chain

```python
# 1. Load environment
dotenv.load_dotenv()

# 2. Database URL (auto-fix Heroku's "postgres://" to "postgresql://")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql:///taraweeh_db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# 3. Flask app creation
app = Flask(__name__, static_folder="static")
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# 4. Session security (production-aware)
app.config["SESSION_COOKIE_SECURE"] = os.getenv("FLASK_ENV") != "development"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
```

### Middleware Stack

```
Request → ProxyFix → CSRF Check → Rate Limiter → Route Handler → Cache Headers → Compression → Response
```

1. **ProxyFix** (line ~85): Handles Heroku's `X-Forwarded-*` headers (1 level)
2. **CSRF Protection** (line ~89): Custom `@before_request` that only enforces on `/admin` and `/login` POST/PUT/PATCH/DELETE
3. **Flask-Limiter** (line 115): Per-route rate limits (no global default)
4. **Flask-Compress** (line ~80): Gzip/Brotli with 500-byte minimum threshold
5. **`@after_request` cache headers** (lines 1611–1624): Route-based `Cache-Control`

### Firebase Admin SDK Init (lines 117–133)

```python
FIREBASE_SERVICE_ACCOUNT = os.getenv("FIREBASE_SERVICE_ACCOUNT")
if FIREBASE_SERVICE_ACCOUNT:
    # Try JSON string first, then file path
    try:
        cred = credentials.Certificate(json.loads(FIREBASE_SERVICE_ACCOUNT))
    except (json.JSONDecodeError, ValueError):
        cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred)
```

---

## Authentication System

### Two Separate Auth Systems

| System | Protects | Mechanism | Users |
|--------|----------|-----------|-------|
| Firebase Admin SDK | `/api/*` routes | Bearer token in header | Public users (Google/Phone) |
| Flask-Login | `/admin/*` routes | Session cookie | Admin user (1 account) |

### Firebase Auth Decorator (`@firebase_auth_required`)

```python
@firebase_auth_required   # Lines 135-156
def some_route():
    user = g.current_public_user  # PublicUser ORM object or None
    token = g.firebase_decoded    # Decoded Firebase token dict
```

**Flow:**
1. Extract `Authorization: Bearer <token>` header
2. Call `firebase_admin.auth.verify_id_token(token, check_revoked=True)`
3. Look up `PublicUser` by `firebase_uid`
4. Set `g.firebase_decoded` and `g.current_public_user`
5. Return 401 if token invalid/expired/revoked, 503 if Firebase unavailable

### Firebase Auth Optional (`@firebase_auth_optional`)

Same as above but does **not** fail if no token provided. Sets `g.current_public_user = None` if no auth.

### Admin Auth (Flask-Login)

- Single admin user created on startup from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars
- `User` model defined in `app.py` (line 211), NOT in `models.py`
- Password hashed with `werkzeug.security.generate_password_hash`
- Login page: `/login` (Jinja2 template `login.html`)
- Protected routes use `@login_required` decorator

---

## Route Map

### SPA & SEO Routes (serve React with meta tags)

| Method | Path | Meta Tags | Purpose |
|--------|------|-----------|---------|
| GET | `/` | Title, description, OG | Home page |
| GET | `/about` | Title, description | About page |
| GET | `/contact` | Title, description | Contact page |
| GET | `/favorites` | Title, description | Favorites page |
| GET | `/tracker` | Title, description | Tracker page |
| GET | `/leaderboard` | Title, description | Leaderboard page |
| GET | `/makkah` | Title, description | Makkah schedule |
| GET | `/u/<username>` | Dynamic user name | Profile page |
| GET | `/mosque/<id>` | Dynamic mosque/imam name | Mosque detail |
| GET | `/map` | — | Map page |

All of these call `serve_react_app(meta_tags={...})` which:
1. Reads cached `frontend/dist/index.html`
2. Replaces `<title>`, `og:title`, `og:description`, `og:url` in HTML
3. Returns the modified HTML

### Static & PWA Routes

| Method | Path | Cache-Control | Purpose |
|--------|------|---------------|---------|
| GET | `/assets/<path>` | `immutable, 1 year` | Vite-built JS/CSS |
| GET | `/static/images/*` | `30 days` | Images |
| GET | `/static/audio/*` | `7 days` | Audio files |
| GET | `/sw.js` | `must-revalidate` | Service Worker |
| GET | `/registerSW.js` | `must-revalidate` | SW registration |
| GET | `/manifest.webmanifest` | `24 hours` | PWA manifest |
| GET | `/sitemap.xml` | — | Dynamic sitemap (Jinja2) |
| GET | `/robots.txt` | — | Generated in-route |

### Public API Routes

| Method | Path | Rate Limit | Description |
|--------|------|------------|-------------|
| GET | `/api/mosques` | — | All mosques with imam data (cached) |
| GET | `/api/mosques/<id>` | — | Single mosque |
| GET | `/api/mosques/search` | 30/min | Search by name/imam/location |
| GET | `/api/mosques/nearby` | 20/min | Sort by distance from lat/lng |
| GET | `/api/areas` | — | 4 area values |
| GET | `/api/locations` | — | Neighborhoods (cached, filterable by area) |
| GET | `/api/imams/search` | 30/min | Fuzzy imam name search |
| GET | `/api/leaderboard` | — | Top 20 contributors |
| GET | `/api/u/<username>` | — | Public user profile + favorites |
| GET | `/api/u/<username>/tracker` | — | Public attendance data |

### Authenticated API Routes (Firebase token required)

| Method | Path | Rate Limit | Description |
|--------|------|------------|-------------|
| POST | `/api/auth/register` | 5/min | Create user account (username, display_name) |
| GET | `/api/auth/me` | — | Current user profile |
| GET | `/api/user/favorites` | — | Favorite mosque IDs |
| POST | `/api/user/favorites/<id>` | — | Add favorite |
| DELETE | `/api/user/favorites/<id>` | — | Remove favorite |
| PUT | `/api/user/favorites` | — | Bulk replace favorites |
| GET | `/api/user/tracker` | — | Attendance data |
| POST | `/api/user/tracker/<night>` | — | Mark night attended (with rakaat) |
| DELETE | `/api/user/tracker/<night>` | — | Unmark night |
| POST | `/api/requests` | 10/min | Submit community request (new mosque or imam change) |
| GET | `/api/requests` | — | User's request history |
| POST | `/api/requests/<id>/cancel` | — | Cancel pending/needs_info request |
| GET | `/api/requests/check-duplicate` | — | Check for duplicate request |
| POST | `/api/transfers` | 10/min | Submit imam transfer (LEGACY — no frontend uses this) |
| DELETE | `/api/transfers/<id>` | — | Cancel pending transfer (LEGACY) |
| GET | `/api/user/transfers` | — | User's transfer history (LEGACY) |

### Community Request Admin API (Firebase auth + admin/moderator role)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/requests` | List community requests (paginated, filterable by status/type) |
| GET | `/api/admin/requests/<id>` | Get single request details |
| POST | `/api/admin/requests/<id>/approve` | Approve request (creates mosque/imam records) |
| POST | `/api/admin/requests/<id>/reject` | Reject with reason |
| POST | `/api/admin/requests/<id>/needs-info` | Ask user for more info |

### Admin API Routes (Flask-Login required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/transfers/<id>/approve` | Approve transfer + award point (LEGACY) |
| POST | `/api/transfers/<id>/reject` | Reject with reason (LEGACY) |
| POST | `/admin/upload-audio` | Upload MP3 to S3 |
| GET/POST | `/admin/mosque/swap-imam/<id>` | Imam swap form |
| GET | `/admin/` | Flask-Admin panel |

### Utility Routes

| Method | Path | Rate Limit | Description |
|--------|------|------------|-------------|
| POST | `/report-error` | 3/min | Email error report to admin |
| GET/POST | `/login` | — | Admin login form |
| GET | `/logout` | — | Admin logout |

---

## Caching System

### In-Memory Caches (global variables)

```python
_imam_index_cache = None        # Pre-computed imam search index
_imam_index_count = None        # Imam count at cache time (for invalidation)
_api_response_cache = {}        # Dict for API response caching
```

### Cache Keys

| Key | Route | What's Cached |
|-----|-------|---------------|
| `"mosques"` | `/api/mosques` | Full mosque+imam JSON list |
| `"locations:"` | `/api/locations` | All location names |
| `"locations:<area>"` | `/api/locations?area=X` | Locations for specific area |
| Imam index | `/api/imams/search` | Normalized imam data for search scoring |

### Invalidation Triggers

| Event | Caches Cleared |
|-------|---------------|
| Admin edits mosque/imam | `_imam_index_cache`, `_api_response_cache` |
| Community request approved | `_imam_index_cache`, `_api_response_cache` |
| Transfer approved (legacy) | `_imam_index_cache`, `_api_response_cache` |
| Heroku dyno restart | All (in-memory = lost) |

**Important limitation**: In-memory cache does NOT survive across Gunicorn workers. If Gunicorn runs multiple workers, each has its own cache.

---

## Search Algorithm

### Mosque Search (`/api/mosques/search`)

1. Build base query: `db.session.query(Mosque, Imam).outerjoin(...)`
2. Apply area filter (if provided)
3. Apply location filter (if provided)
4. Load ALL matching rows into Python
5. Filter in Python using `normalize_arabic()`:
   - Check if normalized query matches mosque name, location, or imam name
   - Case-insensitive substring matching
6. Return filtered results as JSON

**Note**: This is O(n) filtering in Python, not database-level full-text search.

### Imam Search (`/api/imams/search`)

Multi-tier scoring algorithm (lines 1317–1378):

| Tier | Score | Match Type |
|------|-------|-----------|
| 1 | 100 | Exact match on full normalized name |
| 1 | 95 | Full name starts with query |
| 2 | 90 | Stripped name starts with stripped query |
| 3 | 80 | Query found as substring in name |
| 3 | 75 | Stripped query found in stripped name |
| 4 | 70-65 | Any word starts with query (single-word) |
| 5 | 75-55 | Multi-word: ratio of matching words |
| 6 | 40-60 | Bigram (Dice coefficient) similarity ≥ 0.6 |
| 6 | 30-50 | Per-word bigram similarity ≥ 0.5 |
| — | 0 | No match |

"Stripped" means: remove الشيخ/شيخ/الامام/امام prefixes + remove ال article from each word.

Returns top 15 results sorted by score descending.

---

## Arabic Text Normalization (`utils.py`)

```python
def normalize_arabic(text):
    # 1. Unify Alif variants: أ إ آ ا → ا
    # 2. Unify Yaa: ي ى → ي
    # 3. Taa Marbuta → Haa: ة → ه
    # 4. Remove diacritics (Tashkeel)
    # 5. Remove Tatweel (ـ)
    # 6. Collapse whitespace
    # 7. Lowercase
```

Used in both mosque search and imam search for fuzzy Arabic matching.

---

## Proximity Sorting (`/api/mosques/nearby`)

1. Accept `lat` and `lng` query params
2. Fetch ALL mosques with non-null coordinates
3. Calculate geodesic distance for each using `geopy.distance.geodesic()`
4. Sort by distance ascending
5. Return with `distance` field added

**Performance note**: Calculates distance for all ~118 mosques in Python on every request. No spatial index.

---

## Email System

- Flask-Mail with Gmail SMTP (port 587, TLS)
- Used for: error reports from `/report-error` endpoint
- Sends to `info@taraweeh.org`
- Reporter email set as `Reply-To` header
- Fails silently if email sending fails (logs error, returns success)

---

## S3 Audio Upload

```python
def upload_audio_to_s3(file):
    # Bucket: S3_BUCKET env var (default: "imams-riyadh-audio")
    # Key: "audio/{uuid}.{extension}"
    # ACL: public-read
    # Returns: https://{bucket}.s3.{region}.amazonaws.com/{key}
```

- Region defaults to `us-east-1`
- Uses `boto3.client('s3')`
- Called from admin upload route and imam swap form

---

## Error Handling Patterns

1. **API routes**: Return JSON `{"error": "message"}` with appropriate HTTP status
2. **Admin routes**: Use Flask-Admin's built-in error handling
3. **Firebase auth**: Catches `InvalidIdTokenError`, `ExpiredIdTokenError`, `RevokedIdTokenError`, `CertificateFetchError`
4. **Email sending**: Try/except with silent failure (logs error)
5. **No global error handler**: No `@app.errorhandler(500)` defined

---

## HTTP Cache Headers (`@after_request`)

| Path Pattern | Cache-Control Header | TTL |
|-------------|---------------------|-----|
| `/assets/*` | `public, max-age=31536000, immutable` | 1 year |
| `/static/images/*` | `public, max-age=2592000` | 30 days |
| `/static/audio/*` | `public, max-age=604800` | 7 days |
| `/sw.js`, `/registerSW.js` | `public, max-age=0, must-revalidate` | 0 |
| `/manifest.webmanifest` | `public, max-age=86400` | 1 day |

---

## Username Validation

```python
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_\u0600-\u06FF]{3,30}$')
RESERVED_USERNAMES = {'admin', 'api', 'static', 'login', ...}  # ~20 reserved words
```

- 3–30 characters
- Alphanumeric, underscore, or Arabic characters
- No reserved words (admin, api, static, login, etc.)
- Must be unique in database

---

## Streak Calculation

```python
def _compute_streaks(nights_set):
    # nights_set = {1, 2, 3, 5, 6}  # set of attended night numbers
    # current_streak: count backwards from highest attended night
    # best_streak: longest consecutive run anywhere
    return (current_streak, best_streak)
```

- Used in tracker API endpoints
- O(n) where n = number of nights attended (max 30)
