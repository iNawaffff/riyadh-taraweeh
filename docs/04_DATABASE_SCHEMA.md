# Database Schema

> **Source of truth:** `models.py` (~130 lines) + `User` class in `app.py` (line 211)
> **Database:** PostgreSQL 16 (Heroku add-on)
> **ORM:** SQLAlchemy 2.0.38 with Flask-SQLAlchemy 3.1.1
> **Migrations:** Alembic via Flask-Migrate

---

## Entity Relationship Diagram (Text)

```
┌──────────────────┐         ┌──────────────────┐
│     mosque       │         │      imam        │
├──────────────────┤         ├──────────────────┤
│ id (PK)          │◄───┐    │ id (PK)          │
│ name             │    │    │ name             │
│ location         │    └────│ mosque_id (FK)   │──── nullable (imam can be unassigned)
│ area             │         │ audio_sample     │
│ map_link         │         │ youtube_link     │
│ latitude         │         └──────────────────┘
│ longitude        │
└────────┬─────────┘
         │
         │  Referenced by:
         │
┌────────┴─────────┐    ┌───────────────────────────┐
│  user_favorite   │    │  imam_transfer_request     │
├──────────────────┤    ├───────────────────────────┤
│ id (PK)          │    │ id (PK)                   │
│ user_id (FK)─────┤───►│ submitter_id (FK)─────────┤───► public_user
│ mosque_id (FK)───┤───►│ mosque_id (FK)────────────┤───► mosque
│ added_at         │    │ current_imam_id (FK)──────┤───► imam (nullable)
└──────────────────┘    │ new_imam_id (FK)──────────┤───► imam (nullable)
         │              │ new_imam_name             │
         ▼              │ notes                     │
┌──────────────────┐    │ status                    │
│   public_user    │    │ reject_reason             │
├──────────────────┤    │ created_at                │
│ id (PK)          │    │ reviewed_at               │
│ firebase_uid     │    │ reviewed_by (FK)──────────┤───► user (admin)
│ username         │    └───────────────────────────┘
│ display_name     │
│ avatar_url       │    ┌───────────────────────────┐
│ email            │    │  taraweeh_attendance      │
│ phone            │    ├───────────────────────────┤
│ contribution_    │    │ id (PK)                   │
│   points         │    │ user_id (FK)──────────────┤───► public_user
│ created_at       │    │ night (1-30)              │
└──────────────────┘    │ mosque_id (FK, nullable)──┤───► mosque
                        │ rakaat (nullable)         │
┌──────────────────┐    │ attended_at               │
│  user (admin)    │    └───────────────────────────┘
├──────────────────┤
│ id (PK)          │
│ username         │
│ password_hash    │
└──────────────────┘
```

---

## Table Details

### `mosque`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `name` | String(100) | NOT NULL | e.g., "جامع الراجحي" |
| `location` | String(200) | NOT NULL | Neighborhood, e.g., "الملقا" (no "حي" prefix) |
| `area` | String(50) | NOT NULL | One of: شمال, جنوب, شرق, غرب |
| `map_link` | String(500) | nullable | Google Maps URL |
| `latitude` | Float | nullable | GPS coordinate |
| `longitude` | Float | nullable | GPS coordinate |

**Relationships:**
- `imams` → `Imam[]` (one-to-many via backref)
- `transfer_requests` → `ImamTransferRequest[]` (one-to-many via backref)

**Notes:**
- A mosque can have multiple imams in the `imam` table, but in practice each mosque has 0 or 1 active imam (the one with `mosque_id` set)
- Coordinates added in migration 1 as NOT NULL, made nullable in migration 2

---

### `imam`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `name` | String(100) | NOT NULL | Always prefixed with "الشيخ" |
| `mosque_id` | Integer | FK → mosque.id, nullable | NULL = unassigned |
| `audio_sample` | String(500) | nullable | URL: S3 or `/static/audio/filename.mp3` |
| `youtube_link` | String(500) | nullable | YouTube channel/video URL |

**Relationships:**
- `mosque` → `Mosque` (many-to-one)

**Key behavior:**
- When imam is "transferred", `mosque_id` is set to NULL on old imam, set to new mosque on new imam
- When imam is created via transfer approval, it's inserted with `mosque_id` set
- An imam with `mosque_id = NULL` is "unassigned" (not at any mosque)

---

### `public_user`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `firebase_uid` | String(128) | UNIQUE, NOT NULL, INDEXED | Firebase authentication ID |
| `username` | String(50) | UNIQUE, NOT NULL | 3-30 chars, alphanumeric + Arabic |
| `display_name` | String(100) | nullable | User-chosen display name |
| `avatar_url` | String(500) | nullable | Profile picture URL (from Google) |
| `email` | String(255) | nullable | Email address |
| `phone` | String(20) | nullable | Phone number |
| `role` | String(20) | NOT NULL, default=`'user'` | RBAC role: `user`, `moderator`, `admin` |
| `trust_level` | String(20) | NOT NULL, default=`'default'` | Trust level: `default`, `trusted`, `not_trusted`. Auto-upgraded to `trusted` after 3+ approved community requests. |
| `contribution_points` | Integer | NOT NULL, default=0 | Approved transfer/request count |
| `created_at` | DateTime | default=utcnow | Registration timestamp |

**Relationships:**
- `favorites` → `UserFavorite[]` (one-to-many, cascade delete)
- `transfer_requests` → `ImamTransferRequest[]` (one-to-many via backref)
- `community_requests` → `CommunityRequest[]` (one-to-many via backref)
- `attendance` → `TaraweehAttendance[]` (one-to-many, cascade delete)

---

### `user_favorite`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `user_id` | Integer | FK → public_user.id, NOT NULL | |
| `mosque_id` | Integer | FK → mosque.id, NOT NULL | |
| `added_at` | DateTime | default=utcnow | When favorited |

**Constraints:**
- `UNIQUE(user_id, mosque_id)` — one favorite per user per mosque

**Relationships:**
- `mosque` → `Mosque` (many-to-one)

---

### `taraweeh_attendance`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `user_id` | Integer | FK → public_user.id, NOT NULL | |
| `night` | Integer | NOT NULL | Ramadan night 1–30 |
| `mosque_id` | Integer | FK → mosque.id, nullable | Which mosque attended |
| `rakaat` | Integer | nullable | Number of rakaat prayed |
| `attended_at` | DateTime | default=utcnow | When marked |

**Constraints:**
- `UNIQUE(user_id, night)` — one record per user per night

**Relationships:**
- `user` → `PublicUser` (many-to-one, cascade delete)
- `mosque` → `Mosque` (many-to-one)

---

### `imam_transfer_request`

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `submitter_id` | Integer | FK → public_user.id, NOT NULL | Who submitted |
| `mosque_id` | Integer | FK → mosque.id, NOT NULL | Target mosque |
| `current_imam_id` | Integer | FK → imam.id, nullable, use_alter | Imam at time of submission |
| `new_imam_id` | Integer | FK → imam.id, nullable, use_alter | Existing imam (if known) |
| `new_imam_name` | String(100) | nullable | Free-text for unknown imams |
| `notes` | String(500) | nullable | Submitter's notes |
| `status` | String(20) | default='pending' | pending / approved / rejected |
| `reject_reason` | String(500) | nullable | Admin's rejection reason |
| `created_at` | DateTime | default=utcnow | Submission timestamp |
| `reviewed_at` | DateTime | nullable | When admin reviewed |
| `reviewed_by` | Integer | FK → user.id, nullable | Which admin reviewed |

**Indexes:**
- `ix_transfer_submitter_mosque_status` on `(submitter_id, mosque_id, status)` — for duplicate check queries

**Relationships:**
- `submitter` → `PublicUser`
- `mosque` → `Mosque`
- `current_imam` → `Imam` (via `current_imam_id`)
- `new_imam` → `Imam` (via `new_imam_id`)
- `reviewer` → `User` (admin, via `reviewed_by`)

**Note:** `use_alter=True` on imam FKs to avoid circular dependency (ImamTransferRequest → Imam, but Imam is defined after ImamTransferRequest in models.py).

**Legacy note:** This table is the OLD imam change system. No frontend components submit new records to it anymore. All new imam change reports go through the `community_request` table instead. This table is kept for historical data only.

---

### `community_request`

> **This is the ACTIVE system** for all user-submitted requests (new mosques + imam changes).

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `submitter_id` | Integer | FK → public_user.id, NOT NULL | Who submitted |
| `request_type` | String(30) | NOT NULL | `new_mosque`, `new_imam`, or `imam_transfer` |
| `status` | String(20) | NOT NULL, default='pending' | `pending` / `approved` / `rejected` / `needs_info` |
| `target_mosque_id` | Integer | FK → mosque.id, nullable | For imam changes: the mosque in question |
| `mosque_name` | String(100) | nullable | For new_mosque: proposed mosque name |
| `mosque_location` | String(200) | nullable | For new_mosque: proposed neighborhood |
| `mosque_area` | String(50) | nullable | For new_mosque: proposed area |
| `mosque_map_link` | String(500) | nullable | For new_mosque: Google Maps URL |
| `imam_source` | String(20) | nullable | `existing` (platform imam) or `new` (brand new imam) |
| `existing_imam_id` | Integer | FK → imam.id, nullable | If imam_source='existing': which imam |
| `imam_name` | String(100) | nullable | If imam_source='new': new imam name |
| `imam_youtube_link` | String(500) | nullable | Optional YouTube link for new imam |
| `notes` | Text | nullable | Submitter's notes |
| `admin_notes` | Text | nullable | Admin's notes (visible to user on needs_info) |
| `reject_reason` | String(500) | nullable | Admin's rejection reason |
| `created_at` | DateTime | default=utcnow | Submission timestamp |
| `reviewed_at` | DateTime | nullable | When admin reviewed |
| `reviewed_by` | Integer | FK → public_user.id, nullable | Which admin/moderator reviewed |

**Request types explained (for junior devs):**

| Backend `request_type` | User sees | What it means |
|------------------------|-----------|---------------|
| `new_mosque` | "مسجد جديد" | User wants to add a mosque that's not in the directory |
| `new_imam` | "تغيير إمام" | User reports an imam change, and the new imam isn't on the platform yet |
| `imam_transfer` | "تغيير إمام" | User reports an imam change, and the new imam already exists on the platform |

> **Key insight:** `new_imam` and `imam_transfer` both display as "تغيير إمام" (imam change) to users. The distinction is internal — it's about whether the imam is new to the platform or already exists. The frontend sends one or the other based on whether the user searched for an existing imam or typed a new name.

**Relationships:**
- `submitter` → `PublicUser`
- `target_mosque` → `Mosque` (nullable)
- `existing_imam` → `Imam` (nullable)
- `reviewer` → `PublicUser` (nullable)

---

### `user` (Admin Only)

**Defined in `app.py` line 211, NOT in `models.py`.**

| Column | Type | Constraints | Description |
|--------|------|------------|-------------|
| `id` | Integer | PK, auto-increment | |
| `username` | String(50) | UNIQUE | Admin username |
| `password_hash` | String(255) | | Werkzeug hashed password |

**Methods:**
- `set_password(password)` → `generate_password_hash(password)`
- `check_password(password)` → `check_password_hash(self.password_hash, password)`

**Note:** Only one admin user is created on app startup from `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars. There is no admin user registration flow.

---

## Migration History

| # | Revision | Date | Change |
|---|----------|------|--------|
| 1 | `5736d410d1f9` | 2025-03-09 | Add `latitude` (NOT NULL) and `longitude` (NOT NULL) to mosque |
| 2 | `6794af60f30e` | 2025-03-09 | Make `latitude` and `longitude` nullable |
| 3 | `31f57866720d` | 2026-02-02 | Add `rakaat` (nullable int) to taraweeh_attendance |
| 4 | `e1f96e25b0fb` | 2026-02-02 | Add `contribution_points` (int, default 0) to public_user |
| 5 | `a3b7c9d1e2f4` | 2026-02-06 | Add `role` (string(20), default `'user'`) to public_user |
| 6 | `503230c0bdc3` | 2026-02-07 | Add `community_request` table + `trust_level` column on public_user |

**Note:** The `imam_transfer_request` table and `user` table were created before Alembic was set up (likely via `db.create_all()` or manual SQL). There is no migration file that creates them.

---

## Data Validation Rules (from CLAUDE.md)

### Areas (`mosque.area`)
Exactly 4 allowed values: `شمال`, `جنوب`, `شرق`, `غرب`

### Locations (`mosque.location`)
- No "حي" prefix (frontend adds it for display)
- Use ة (taa marbuta), not ه
- Keep الـ article
- No trailing spaces, single spaces only

### Mosque Names (`mosque.name`)
- Keep type prefix (جامع/مسجد/مجمع)
- Use ة (taa marbuta)
- Single spaces, no trailing spaces

### Imam Names (`imam.name`)
- Always use "الشيخ" prefix
- Use ة (taa marbuta)
- Full name required (first + last minimum)
- Single spaces, no trailing spaces

---

## Data Quality Audit Queries

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

-- Unassigned imams
SELECT name FROM imam WHERE mosque_id IS NULL;

-- Mosques without imams
SELECT m.name FROM mosque m LEFT JOIN imam i ON i.mosque_id = m.id WHERE i.id IS NULL;
```
