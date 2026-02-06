# Inconsistencies & Documentation Drift

> **Method:** Cross-referenced `CLAUDE.md`, `PROJECT_STATUS.md`, `CHANGELOG-staging.md`, `FRONTEND_MIGRATION.md` against actual source code.
> **Source of truth:** Always the CODE, not documentation.

---

## Confirmed Inconsistencies

### 1. Search Debounce Timing

| Source | Claims | Actual (Code) |
|--------|--------|---------------|
| CLAUDE.md | "500ms debounce" | **Correct** for main search (HomePage.tsx line 31: `useDebounce(searchQuery, 500)`) |
| PROJECT_STATUS.md | "300ms debounce on search inputs" | **Incorrect** for main search. 300ms is used only in TransferDialog imam search (line 43: `useDebounce(searchQuery, 300)`) |

**Verdict:** CLAUDE.md is correct. PROJECT_STATUS.md is misleading — 300ms applies only to imam search in the transfer dialog, not the main search.

---

### 2. Neighborhood Count

| Source | Claims | Actual |
|--------|--------|--------|
| CLAUDE.md | "59 distinct locations" | Likely outdated |
| PROJECT_STATUS.md | "~66 distinct neighborhoods" | More recent estimate |

**Verdict:** Both may be outdated. The actual count depends on current database state. Neither is verified against a live query.

---

### 3. `User` Model Location

| Source | Claims | Actual |
|--------|--------|--------|
| CLAUDE.md (Database Models section) | Lists "User: Admin authentication" alongside models in models.py | `User` class is in **`app.py` line 211**, NOT in `models.py` |

**Verdict:** CLAUDE.md is misleading. The User model is defined in app.py alongside admin setup code. All other models are in models.py.

---

### 4. Missing Pages in CLAUDE.md — RESOLVED (2026-02-06)

~~CLAUDE.md's pages list was incomplete.~~ **Fixed:** CLAUDE.md now includes all pages including MapPage, LeaderboardPage, MakkahSchedulePage, and all admin pages.

---

### 5. Missing Model Fields in Documentation

| Model | Field | In CLAUDE.md | In PROJECT_STATUS.md | In Code |
|-------|-------|-------------|---------------------|---------|
| TaraweehAttendance | `rakaat` | Missing | Missing (schema diagram) | **Exists** (migration 3, `31f57866720d`) |
| PublicUser | `contribution_points` | Missing from models section | In schema diagram | **Exists** (migration 4, `e1f96e25b0fb`) |
| ImamTransferRequest | entire model | Missing from CLAUDE.md models | In schema diagram | **Exists** in models.py |

**Verdict:** CLAUDE.md's models section was written before the transfer system and rakaat feature. PROJECT_STATUS.md's schema diagram is more current but still misses `rakaat`.

---

### 6. Icons Documentation

| Source | Claims | Actual |
|--------|--------|--------|
| CLAUDE.md | "Icons: lucide-react" | **Incomplete.** Also uses `react-icons` (Font Awesome FaMosque) |
| PROJECT_STATUS.md | "Icons: lucide-react, react-icons (Font Awesome)" | **Correct** |

**Verdict:** CLAUDE.md was not updated when react-icons was added (commit `c446b15`).

---

### 7. Missing Hooks in CLAUDE.md

| Hook | In CLAUDE.md | Actually Exists |
|------|-------------|-----------------|
| `use-mosques.ts` | Yes | Yes |
| `use-audio-player.ts` | Yes | Yes |
| `use-auth.ts` | Yes | Yes |
| `use-favorites.ts` | Yes | Yes |
| `use-geolocation.ts` | Yes | Yes |
| `use-debounce.ts` | Yes | Yes |
| `use-media-query.ts` | Yes | Yes |
| **`use-transfers.ts`** | **Missing** | **Yes** (imam transfer hooks) |

**Verdict:** `use-transfers.ts` was added with the transfer system but not added to CLAUDE.md.

---

### 8. Missing Components in CLAUDE.md

| Component Directory | In CLAUDE.md | Actually Exists |
|--------------------|-------------|-----------------|
| `components/icons/` | Missing | Yes (`MosqueIcon.tsx`) |
| `components/mosque/TransferDialog.tsx` | Missing | Yes |
| `components/mosque/ShareButton.tsx` | Missing | Yes |
| `components/mosque/DistanceBadge.tsx` | Missing | Yes |
| `components/search/FavoritesFilterButton.tsx` | Missing | Yes |
| `components/search/LocationPermissionModal.tsx` | Missing | Yes |

---

### 9. `robots.txt` Handling

| Source | Claims | Actual |
|--------|--------|--------|
| Migrations/templates agent | "robots.txt not present as a file" | **Correct** — it's generated dynamically in Flask route |
| PROJECT_STATUS.md | Not mentioned | Route exists in app.py |

The `robots.txt` is not a static file but a Flask route that returns:
```
User-agent: *
Allow: /
Sitemap: https://taraweeh.org/sitemap.xml
```

---

### 10. API Endpoints Missing from CLAUDE.md

| Endpoint | In CLAUDE.md | Actually Exists |
|----------|-------------|-----------------|
| `GET /api/areas` | Missing | Yes |
| `GET /api/imams/search` | Missing | Yes |
| `POST /api/transfers` | Missing | Yes |
| `DELETE /api/transfers/<id>` | Missing | Yes |
| `GET /api/user/transfers` | Missing | Yes |
| `POST /api/transfers/<id>/approve` | Missing | Yes |
| `POST /api/transfers/<id>/reject` | Missing | Yes |
| `GET /api/leaderboard` | Missing | Yes |
| `PUT /api/user/favorites` | Missing | Yes |

**Verdict:** CLAUDE.md's API section was written before the transfer system, leaderboard, and imam search features.

**Note (2026-02-06):** The new admin API endpoints (`/api/admin/*`) ARE documented in CLAUDE.md.

---

### 11. Leaderboard Route Meta Title

| Source | In Code | Note |
|--------|---------|------|
| `app.py` line 1226 | `"المتصدرون - أئمة التراويح"` | Uses OLD name "المتصدرون" |
| Frontend LeaderboardPage | "المساهمون" | Uses NEW name |
| PROJECT_STATUS.md | "Renamed from المتصدرون to المساهمون" | Documents the rename |

**Verdict:** The Flask SEO meta tag for `/leaderboard` still uses the old name "المتصدرون". The React page itself uses the correct "المساهمون". This means the server-injected `<title>` tag has the old name, but React's `react-helmet` overrides it client-side. **SEO crawlers that don't execute JS will see the old name.**

---

## Documentation Freshness Summary

| Document | Last Major Update | Completeness |
|----------|-------------------|-------------|
| `CLAUDE.md` | 2026-02-06 (admin panel) | ~90% current — includes admin panel, RBAC, audio pipeline, all pages/components |
| `docs/06_ADMIN_SYSTEM.md` | 2026-02-06 (admin panel, audio upload-file endpoint) | ~98% current — documents both admin interfaces, audio pipeline with 3 input methods |
| `docs/05_MEDIA_PIPELINE.md` | 2026-02-06 (file upload, S3 ACL fix) | ~98% current — includes all 3 audio input methods, YouTube limitation |
| `docs/04_DATABASE_SCHEMA.md` | 2026-02-06 (role column) | ~95% current — includes `role` column on public_user |

---

## Recommendations

1. ~~**Update CLAUDE.md** to include: transfer system, leaderboard, MapPage, MakkahSchedulePage, all new hooks/components~~ **DONE** (2026-02-06): CLAUDE.md updated with admin panel, RBAC, all pages/hooks/components
2. **Fix leaderboard meta tag** in `app.py` from "المتصدرون" to "المساهمون"
3. ~~**Add `rakaat` field** to PROJECT_STATUS.md schema diagram~~ PROJECT_STATUS.md deleted (redundant with docs/)
4. ~~**Clarify debounce timing** in PROJECT_STATUS.md~~ PROJECT_STATUS.md deleted
5. **Move `User` model** to models.py or document its location explicitly
6. **Split `app.py`** into Blueprints — now ~2150 lines after admin API + audio file upload (critical debt)
