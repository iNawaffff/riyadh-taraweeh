# Admin System

The project has **two admin interfaces**: the new React admin panel and the legacy Flask-Admin.

---

## New Admin Panel (React)

> **Technology:** React 19 + shadcn/ui + TanStack Table + wavesurfer.js
> **Auth:** Firebase Auth + `public_user.role` column (admin/moderator)
> **URL:** `/dashboard/*`
> **API:** `/api/admin/*`

### RBAC

Three roles stored in `public_user.role` (default: `user`):

| Role | Access | Can change roles? |
|------|--------|-------------------|
| `user` | Public site only | No |
| `moderator` | Admin panel (CRUD, transfers) | No |
| `admin` | Admin panel + user role management | Yes |

All admin API endpoints use the `@admin_or_moderator_required` decorator which:
1. Verifies Firebase ID token from `Authorization: Bearer <token>` header
2. Looks up `public_user` by `firebase_uid`
3. Checks `role in ('admin', 'moderator')`
4. Returns 401/403 if not authorized

### Admin API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/stats` | Dashboard counts (mosques, imams, users, pending transfers) |
| GET | `/api/admin/mosques` | List mosques (paginated, searchable, filterable by area) |
| POST | `/api/admin/mosques` | Create mosque (+ optional imam) |
| PUT | `/api/admin/mosques/<id>` | Update mosque |
| DELETE | `/api/admin/mosques/<id>` | Delete mosque |
| GET | `/api/admin/imams` | List imams (paginated, searchable) |
| POST | `/api/admin/imams` | Create imam |
| PUT | `/api/admin/imams/<id>` | Update imam |
| DELETE | `/api/admin/imams/<id>` | Delete imam |
| GET | `/api/admin/transfers` | List transfer requests (filterable by status) |
| POST | `/api/admin/transfers/<id>/approve` | Approve transfer + award point |
| POST | `/api/admin/transfers/<id>/reject` | Reject transfer (with reason) |
| GET | `/api/admin/users` | List users (paginated, searchable) |
| PUT | `/api/admin/users/<id>/role` | Change user role (admin only) |

### Audio Pipeline Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/admin/audio/extract` | Extract audio from Twitter/X URL via yt-dlp |
| POST | `/api/admin/audio/upload-file` | Upload audio file directly (MP3/M4A/WAV/OGG/WebM/AAC) |
| GET | `/api/admin/audio/temp/<id>` | Serve temp audio file for waveform preview |
| POST | `/api/admin/audio/trim-upload` | Trim audio (start/end ms) + optional filename + upload to S3 |

**Flow:** Paste URL or upload file → temp audio saved → wavesurfer.js displays waveform → user drags region → optionally names file → ffmpeg trims → upload to S3 → S3 URL saved to imam.

**Note:** YouTube extraction is blocked on Heroku (datacenter IP). Use file upload for YouTube content.

### Frontend Pages

| Page | Route | Purpose |
|------|-------|---------|
| DashboardPage | `/dashboard` | 4 stat cards overview |
| MosquesPage | `/dashboard/mosques` | Mosques data table + CRUD |
| MosqueFormPage | `/dashboard/mosques/new` | Create mosque form |
| MosqueFormPage | `/dashboard/mosques/:id/edit` | Edit mosque form |
| ImamsPage | `/dashboard/imams` | Imams data table |
| TransfersPage | `/dashboard/transfers` | Approve/reject transfer requests |
| UsersPage | `/dashboard/users` | User list + role management |

### Key Components

- **AdminGuard** — Route protection, checks `user.role` in context
- **AdminSidebar** — RTL collapsible sidebar (dark green #0d4b33 + gold #c4a052)
- **AdminHeader** — Top bar with user info, logout, back-to-site link
- **DataTable** — Reusable TanStack Table wrapper (sorting, search, server pagination)
- **AudioPipeline** — wavesurfer.js waveform with RegionsPlugin for trim selection
- **MosqueForm** — Combined mosque+imam+audio form with validation

---

## Legacy Admin Panel (Flask-Admin)

> **Technology:** Flask-Admin 1.6.1 with Bootstrap 3
> **Auth:** Flask-Login (session-based, single admin user)
> **URL:** `/admin/`

### Single Admin User

- Created on app startup (lines 235–250 in `app.py`)
- Credentials from environment variables:
  - `ADMIN_USERNAME` (default: `"admin"`)
  - `ADMIN_PASSWORD` (default: `"adminpassword"`)
- Password hashed with `werkzeug.security.generate_password_hash`
- If user already exists, password is updated to match env var on each startup

### Login Flow

```
GET /login → Renders login.html (Jinja2, Bootstrap 3)
POST /login → Verify username/password → Redirect to /admin/
GET /logout → Logout → Redirect to /
```

### Access Control

- All `/admin/*` routes protected by `@login_required`
- CSRF protection enforced on POST/PUT/PATCH/DELETE to `/admin` and `/login`
- `BaseModelView.is_accessible()` returns `current_user.is_authenticated`
- Unauthorized access redirects to `/login`

---

## Flask-Admin Panel

### Registered Views

| View | Model | URL | Capabilities |
|------|-------|-----|-------------|
| MosqueModelView | Mosque | `/admin/mosque/` | CRUD + imam management |
| ImamModelView | Imam | `/admin/imam/` | CRUD + mosque assignment |
| PublicUserModelView | PublicUser | `/admin/publicuser/` | Read + edit |
| UserFavoriteModelView | UserFavorite | `/admin/userfavorite/` | Read |
| TaraweehAttendanceModelView | TaraweehAttendance | `/admin/taraweehattendance/` | Read |
| TransferRequestModelView | ImamTransferRequest | `/admin/imamtransferrequest/` | Read + approve/reject |

### Admin Index

Custom `MyAdminIndexView` at `/admin/` requires `@login_required`.

---

## Mosque Management (MosqueModelView)

### List View

| Displayed Columns | Searchable | Filterable |
|-------------------|-----------|------------|
| name | name | area |
| imam (formatted) | location | |
| area | area | |
| location | | |
| map_link (clickable) | | |
| actions (swap imam button) | | |

- Page size: 50 records
- Default sort: by name ascending
- Export enabled

### Create/Edit Form

Standard mosque fields plus **injected imam fields**:
- `imam_name` — Imam name text field
- `imam_audio` — Audio sample URL/file
- `imam_youtube` — YouTube link

### on_form_prefill() — Edit Pre-fill

When editing a mosque, the form is pre-filled with the current imam's data:
```python
imam = Imam.query.filter_by(mosque_id=model.id).first()
if imam:
    form.imam_name.data = imam.name
    form.imam_audio.data = imam.audio_sample
    form.imam_youtube.data = imam.youtube_link
```

### after_model_change() — Save Logic

After saving a mosque:
1. If `imam_name` provided:
   - Find existing imam for this mosque, or create new one
   - Update name, audio, youtube
2. If `imam_name` empty and existing imam:
   - Unset `mosque_id` on imam (unassign)
3. Clear caches: `_imam_index_cache = None`, `_api_response_cache.clear()`

---

## Imam Management (ImamModelView)

### List View

| Displayed | Searchable | Filterable |
|-----------|-----------|------------|
| name | name | mosque |
| mosque | | |
| audio_sample | | |
| youtube_link | | |

### Form

- `mosque` field: `QuerySelectField` with optional blank (imam can be unassigned)
- Standard text fields for name, audio, youtube

---

## Imam Swap Feature

### Custom Route: `/admin/mosque/swap-imam/<mosque_id>`

**Purpose:** Complex imam reassignment between mosques.

### GET — Swap Form

Displays form with:
1. Current mosque info and current imam
2. **New imam source** (radio):
   - "Existing imam" — dropdown of all imams
   - "New imam" — name, audio file upload, YouTube link
3. **Current imam action** (radio):
   - "Unassign" — set `mosque_id = NULL`
   - "Transfer to another mosque" — pick destination mosque
   - "Swap" — exchange imams between two mosques
   - "Delete" — delete imam record entirely

### POST — Execute Swap

```
1. Determine incoming imam:
   - If "existing": look up by ID
   - If "new": create Imam record, upload audio to S3 if provided

2. Handle outgoing imam based on action:
   - "unassign": set mosque_id = NULL
   - "transfer": set mosque_id = destination mosque ID
   - "swap": exchange mosque_ids between incoming and outgoing
   - "delete": db.session.delete(old_imam)

3. Set incoming imam's mosque_id = target mosque

4. Commit all changes

5. Clear caches
```

---

## Transfer Request Moderation (TransferRequestModelView)

### List View

| Displayed | Filterable | Sortable |
|-----------|-----------|----------|
| id | status | created_at (default, desc) |
| submitter | | |
| mosque | | |
| current_imam | | |
| new_imam | | |
| new_imam_name | | |
| notes | | |
| status | | |
| reject_reason (inline editable) | | |
| created_at | | |
| reviewed_at | | |

- Page size: 50
- Cannot create new records (user-submitted only)
- Can edit (for inline reject_reason editing)

### Batch Actions

#### Approve (action_approve)

```python
for transfer in selected:
    if transfer.status != "pending": skip

    # 1. Unassign old imam
    old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    if old_imam:
        old_imam.mosque_id = None

    # 2. Assign new imam
    if transfer.new_imam_id:
        new_imam = Imam.query.get(transfer.new_imam_id)
        new_imam.mosque_id = mosque.id
    elif transfer.new_imam_name:
        new_imam = Imam(name=transfer.new_imam_name, mosque_id=mosque.id)
        db.session.add(new_imam)

    # 3. Award contribution point (atomic SQL increment)
    submitter.contribution_points = PublicUser.contribution_points + 1

    # 4. Update transfer status
    transfer.status = "approved"
    transfer.reviewed_at = datetime.utcnow()
    transfer.reviewed_by = current_user.id

# 5. Clear caches
_imam_index_cache = None
_api_response_cache.clear()
```

#### Reject (action_reject)

```python
for transfer in selected:
    if transfer.status != "pending": skip
    transfer.status = "rejected"
    transfer.reviewed_at = datetime.utcnow()
    transfer.reviewed_by = current_user.id
    # reject_reason preserved from inline edit
```

### Individual Approve/Reject API

Also available as API endpoints (used by frontend admin, if needed):

```
POST /api/transfers/<id>/approve  (Flask-Login required)
POST /api/transfers/<id>/reject   (Flask-Login required, body: { reason: "..." })
```

---

## Audio Upload

### Endpoint

```
POST /admin/upload-audio
Authorization: Flask-Login session
Content-Type: multipart/form-data

Response: { "url": "https://imams-riyadh-audio.s3.us-east-1.amazonaws.com/audio/{uuid}.mp3" }
```

### S3 Upload Logic

```python
def upload_audio_to_s3(file):
    bucket = os.getenv("S3_BUCKET", "imams-riyadh-audio")
    region = os.getenv("AWS_REGION", "us-east-1")
    ext = file.filename.rsplit(".", 1)[-1]
    key = f"audio/{uuid.uuid4()}.{ext}"

    s3 = boto3.client("s3",
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        region_name=region)

    s3.upload_fileobj(file, bucket, key, ExtraArgs={"ContentType": "audio/mpeg"})
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
```

---

## Admin Workflow Summary

### Adding a New Mosque

1. Go to `/admin/mosque/` → Create
2. Fill: name, location, area, map_link
3. Fill imam fields: imam_name, imam_audio (URL or upload), imam_youtube
4. Save → creates Mosque + Imam records
5. Run `extract_coordinates.py` if GPS needed from map_link

### Updating an Imam

1. Go to `/admin/mosque/` → Edit mosque
2. Change imam_name, imam_audio, or imam_youtube
3. Save → updates existing Imam record

### Swapping Imams

1. Go to `/admin/mosque/` → Click "تبديل الإمام" on mosque row
2. Choose new imam source (existing or new)
3. Choose action for current imam (unassign/transfer/swap/delete)
4. Submit

### Reviewing Transfer Requests

1. Go to `/admin/imamtransferrequest/`
2. Filter by status = "pending"
3. Review submissions
4. Select rows → batch Approve or Reject
5. For rejections, edit `reject_reason` inline first
