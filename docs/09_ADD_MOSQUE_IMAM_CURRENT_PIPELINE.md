# Adding Mosques & Imams: Current Pipeline

> **This documents how mosques and imams are currently added/modified in the system.**
> **Key finding:** There is NO public-facing mosque submission flow. All mosque/imam management is admin-only.

---

## Adding a New Mosque

### Method 1: Flask-Admin Panel (Primary)

**Who:** Admin user
**Where:** `/admin/mosque/` → Create

**Steps:**

```
1. Login to /admin/
2. Navigate to Mosque model view
3. Click "Create"
4. Fill form fields:
   - name: "جامع الراجحي" (required)
   - location: "الملقا" (required, no حي prefix)
   - area: "شمال" (required, one of 4 values)
   - map_link: Google Maps URL (optional)
   - latitude/longitude: (optional, can extract later)
   - imam_name: "الشيخ خالد الجليل" (injected field)
   - imam_audio: URL or file upload (injected field)
   - imam_youtube: YouTube link (injected field)
5. Save
```

**What happens on save** (`after_model_change`):
```python
# 1. Mosque record created in DB
# 2. If imam_name provided:
#    - Create new Imam record with mosque_id set
#    - If imam_audio is a file: upload to S3, store URL
#    - If imam_audio is a URL: store as-is
#    - Set youtube_link
# 3. Clear caches
```

### Method 2: Direct Database (Emergency)

```sql
INSERT INTO mosque (name, location, area, map_link)
VALUES ('جامع جديد', 'الملقا', 'شمال', 'https://maps.google.com/...');

INSERT INTO imam (name, mosque_id, audio_sample, youtube_link)
VALUES ('الشيخ فلان', <mosque_id>, NULL, NULL);
```

### GPS Coordinate Extraction

After adding a mosque with a Google Maps link:

```bash
python extract_coordinates.py
```

This utility:
1. Iterates through ALL mosques with map_link but no coordinates
2. Follows Google Maps short URLs to get redirect
3. Extracts lat/lng from URL patterns (`@lat,lng`, `ll=lat,lng`, `q=lat,lng`)
4. Updates `mosque.latitude` and `mosque.longitude`
5. Commits changes

---

## Adding a New Imam

### Method 1: Via Mosque Admin (Most Common)

When editing a mosque in Flask-Admin, fill the injected imam fields:
- `imam_name`: Creates or updates Imam record linked to that mosque
- `imam_audio`: Audio sample URL or file upload
- `imam_youtube`: YouTube link

### Method 2: Flask-Admin Imam View

**Where:** `/admin/imam/` → Create

**Steps:**
```
1. Fill: name, mosque (dropdown), audio_sample, youtube_link
2. Save
```

### Method 3: Via Transfer Approval

When admin approves a transfer request that includes `new_imam_name`:
```python
new_imam = Imam(name=transfer.new_imam_name, mosque_id=mosque.id)
db.session.add(new_imam)
```

**Limitation:** New imam created via transfer has NO audio_sample and NO youtube_link. Admin must manually add these later.

### Method 4: Via Imam Swap Form

**Where:** `/admin/mosque/swap-imam/<mosque_id>`

If "New imam" radio is selected:
- Fill: name, audio file (upload to S3), YouTube link
- Creates new Imam record

---

## Modifying an Existing Imam

### Change Imam's Mosque Assignment

**Option A: Imam Swap Form** (preferred for complex swaps)
```
/admin/mosque/swap-imam/<mosque_id>
- Pick existing imam from dropdown
- Choose action for current imam (unassign/transfer/swap/delete)
- Submit
```

**Option B: Flask-Admin Imam Edit**
```
/admin/imam/ → Edit imam → change mosque dropdown → Save
```

**Option C: Transfer Approval**
```
User reports change → Admin approves → old imam unassigned, new assigned
```

### Update Imam Audio/YouTube

**Via Flask-Admin:**
```
/admin/imam/ → Edit → change audio_sample/youtube_link → Save
```

**Via Mosque Edit:**
```
/admin/mosque/ → Edit mosque → change imam_audio/imam_youtube → Save
```

---

## Modifying an Existing Mosque

### Via Flask-Admin Mosque Edit

```
/admin/mosque/ → Edit → change name/location/area/map_link → Save
```

### Via Direct API (No Endpoint)

There is no public API for modifying mosques. All modifications go through Flask-Admin.

---

## Data Validation (Manual Process)

There are NO automated data validation constraints beyond SQL types. The following rules are documented in CLAUDE.md but enforced only by convention:

| Rule | Enforcement |
|------|------------|
| Area must be شمال/جنوب/شرق/غرب | Manual (admin selects from options) |
| Location: no "حي" prefix | Manual (documented convention) |
| Location: use ة not ه | Manual (documented convention) |
| Imam name: "الشيخ" prefix | Manual (documented convention) |
| No trailing spaces | Manual (documented convention) |
| Single spaces only | Manual (documented convention) |

**Audit queries** are provided in CLAUDE.md for periodic data quality checks.

---

## User-Initiated Data Corrections

### Error Report Flow

**Who:** Any user (no auth required)
**Where:** MosqueDetailPage → "تبليغ عن خطأ" (Report Error) button

```
1. User clicks report button
2. Modal opens with:
   - Checkboxes: error types (location, imam, audio, other)
   - Textarea: additional details
   - Email field (optional, for reply)
3. Submit → POST /report-error (form data)
4. Backend:
   - Logs report to console
   - Sends email to info@taraweeh.org
   - Reporter email set as Reply-To
5. Admin reads email, manually fixes via admin panel
```

**This is NOT automated.** Error reports generate an email. An admin must manually review and fix data.

### Imam Transfer Flow (Crowdsourced)

**Who:** Authenticated users
**Where:** MosqueDetailPage → "تغيّر؟" next to imam name

See [TRANSFER_WORKFLOW_CURRENT.md](./08_TRANSFER_WORKFLOW_CURRENT.md) for full details.

Key difference from error reports:
- Creates a database record (trackable)
- Admin can approve/reject in admin panel
- Approval automatically updates imam assignment
- Awards contribution points

---

## Pipeline Gaps & Manual Steps

```
┌────────────────────────────────────────────────────┐
│  FULLY AUTOMATED                                    │
│  ✓ Transfer approval → imam reassignment           │
│  ✓ Transfer approval → point award                 │
│  ✓ S3 audio upload                                 │
│  ✓ Cache invalidation on data changes              │
│  ✓ GPS extraction from Google Maps URLs            │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│  MANUAL STEPS REQUIRED                              │
│  ✗ Adding new mosques (admin panel only)           │
│  ✗ Adding audio to imam created via transfer       │
│  ✗ Data quality validation (run SQL queries)       │
│  ✗ Processing error reports (read email, fix data) │
│  ✗ Running extract_coordinates.py after new mosque │
│  ✗ Verifying transfer reports are accurate         │
└────────────────────────────────────────────────────┘
```

---

## Suggested Workflow for Adding Multiple Mosques

```
1. Prepare data in spreadsheet:
   mosque_name | location | area | map_link | imam_name | audio_url | youtube

2. For each row:
   a. Create mosque in /admin/mosque/ (fill all fields)
   b. If audio file: upload via admin, or pre-upload to S3

3. After all mosques added:
   a. Run: python extract_coordinates.py
   b. Run validation queries from CLAUDE.md
   c. Verify frontend displays correctly

4. Clear browser cache / PWA cache if needed for testing
```
