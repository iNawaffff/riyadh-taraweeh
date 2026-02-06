# Known Technical Debt

> **Identified during codebase audit on 2026-02-06.**
> **Severity:** Critical / High / Medium / Low

---

## Critical

### 1. Monolith `app.py` (~2100 lines)

**What:** All routes, admin config, admin API endpoints, auth decorators, caching logic, search algorithms, email, S3 uploads, audio pipeline, and business logic in a single file. Grew further with the addition of admin API endpoints (~500 lines).

**Impact:** Extremely difficult to maintain, test, or onboard new developers. Any change risks breaking unrelated functionality.

**Should be:** Split into Flask Blueprints (routes), services (business logic), decorators (auth), and config modules.

---

### 2. `User` Model Defined in `app.py`, Not `models.py`

**What:** The admin `User` class (line 211 of `app.py`) is separate from all other models in `models.py`.

**Impact:** Circular import risk, inconsistent model location, confusing for developers.

**Should be:** All models in `models.py`.

---

### 3. In-Memory Cache with Multi-Worker Risk

**What:** `_imam_index_cache` and `_api_response_cache` are Python global variables. Gunicorn runs multiple workers, each with its own cache.

**Impact:**
- Cache inconsistency between workers (Worker A invalidates, Worker B still has stale data)
- Cache lost on every dyno restart
- No cache sharing between staging/production

**Should be:** Redis or similar shared cache, or single-worker mode documented as requirement.

---

## High

### 4. No Database Validation Constraints

**What:** Data naming conventions (area values, location format, imam name prefix) are documented in CLAUDE.md but NOT enforced at database level.

**Impact:** Data quality drift over time. Admin can enter "حي الملقا" instead of "الملقا", breaking frontend display.

**Should have:** CHECK constraints, ENUM types, or application-level validation.

---

### 5. Python-Side Search Filtering

**What:** Mosque search loads ALL mosques from DB, then filters in Python (O(n) per request).

**Impact:** Works fine for 118 mosques but won't scale. Every search request touches all rows.

**Should be:** PostgreSQL full-text search with `tsvector`, or at minimum SQL `ILIKE` filtering.

---

### 6. Missing Migration Files for Some Tables

**What:** The migration history only shows 5 migrations (coordinates, nullable, rakaat, contribution_points, role). Tables like `imam_transfer_request`, `user`, `public_user`, `user_favorite`, `taraweeh_attendance` were created outside Alembic (likely `db.create_all()`).

**Impact:** Cannot reliably track schema evolution. New developers can't understand the full migration history.

---

### 7. No Automated CI/CD

**What:** Manual `git push` to Heroku remotes. No GitHub Actions, no pre-deploy tests.

**Impact:** Tests exist (pytest + Playwright) but aren't run automatically. Broken code can reach production.

---

## Medium

### 8. Proximity Calculation in Python

**What:** `/api/mosques/nearby` calculates geodesic distance for ALL mosques in Python, every request.

**Impact:** O(n) computation per request. Works for 118 mosques but won't scale to multi-city.

**Should be:** PostGIS spatial index, or pre-computed distance at query time.

---

### 9. No Soft Delete for Cancelled Transfers

**What:** `DELETE /api/transfers/<id>` hard-deletes the record.

**Impact:** No audit trail for cancelled transfer requests. Cannot analyze submission patterns.

---

### 10. Admin Default Password in Code

**What:** Default admin password is `"adminpassword"` in code. While overridden by env var in production, the default is insecure.

---

### 11. Legacy Jinja2 Templates Still Present

**What:** `templates/` contains 6 legacy HTML files (index, about, contact, mosque_detail, base) that are no longer used by the React frontend.

**Impact:** Confusing for developers. Dead code. The templates reference outdated features.

**Exception:** `login.html` and `sitemap.xml` are still actively used.

---

### 12. `.env` File in `templates/` Directory

**What:** There's a `.env` file inside the `templates/` directory. Likely a misconfiguration.

**Impact:** Could potentially leak environment variables if templates are publicly accessible (they aren't, but it's bad practice).

---

### 13. No Error Handler for 500

**What:** No `@app.errorhandler(500)` registered. Internal server errors return Flask's default HTML error page.

**Impact:** API consumers get HTML instead of JSON on unhandled errors.

---

### 14. Duplicate Arabic Normalization

**What:** Arabic text normalization exists in both:
- `utils.py` (backend, Python)
- `lib/arabic-utils.ts` (frontend, TypeScript)

**Impact:** Two implementations that must stay in sync. If one changes, search behavior diverges between frontend and backend.

---

## Low

### 15. Hardcoded Ramadan Dates

**What:** `lib/arabic-utils.ts` has hardcoded Ramadan 1447 dates (Feb 18 – Mar 19, 2026).

**Impact:** Must be manually updated each year for the Ramadan countdown feature.

---

### 16. No Pagination on Admin Transfer List

**What:** `GET /api/user/transfers` returns ALL user transfers without pagination.

**Impact:** Fine for now but could grow large for active contributors.

**Note:** The new admin API at `GET /api/admin/transfers` does support pagination and filtering by status.

---

### 17. Static Makkah Schedule Data

**What:** MakkahSchedulePage contains hardcoded imam schedule data (7 imams, 30 nights).

**Impact:** Must be manually updated each Ramadan. Not stored in database.

---

### 18. `serialize_mosque()` Helper Repeated

**What:** Mosque serialization logic is in a helper function but the pattern of querying Mosque+Imam with outerjoin is repeated across multiple routes.

**Impact:** If serialization format changes, multiple routes need updating.

---

### 19. No Rate Limiting on Several Authenticated Endpoints

**What:** Endpoints like `POST /api/user/favorites`, `POST /api/user/tracker/<night>`, `GET /api/auth/me` have no rate limits.

**Impact:** An authenticated user could theoretically spam these endpoints.

---

### 20. Single Test Files

**What:** Only 2 frontend test files (`FavoritesFilterButton.test.tsx`, `NotFoundPage.test.tsx`) and minimal backend tests.

**Impact:** Very low test coverage. Most features untested.
