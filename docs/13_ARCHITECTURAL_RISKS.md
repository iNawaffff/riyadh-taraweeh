# Architectural Risks

> **Context:** Risks identified during codebase audit. These are NOT bugs — they are architectural decisions that may cause problems at scale or in specific scenarios.

---

## Risk 1: Single-File Backend (Blast Radius)

**What:** All backend logic in `app.py` (1631 lines).

**Risk:** Any syntax error, import failure, or unhandled exception in any route can crash the entire application. A bug in the email system can take down the API. A change to admin logic can break public search.

**Trigger:** Any code change to app.py.

**Mitigation:** None currently. No blueprints, no service separation.

**Severity:** High (development velocity) / Medium (production stability — Gunicorn restarts workers)

---

## Risk 2: In-Memory Cache Inconsistency

**What:** `_imam_index_cache` and `_api_response_cache` are Python process-level globals.

**Scenario:**
```
Gunicorn Worker A: serves cached mosque list (version 1)
Admin approves transfer via Worker B: clears Worker B's cache
Worker A: still serves stale data until next invalidation trigger
```

**Trigger:** Multi-worker Gunicorn deployment (default: 4 workers on Heroku).

**Impact:** Users may see stale data for minutes after admin changes.

**Workaround:** Heroku's default is WEB_CONCURRENCY based on dyno RAM. Single worker would fix consistency but reduce throughput.

**Severity:** Medium

---

## Risk 3: No Database-Level Data Validation

**What:** Area values, location format, imam name prefix — all enforced only by human convention.

**Scenario:**
```
Admin enters location "حي الملقا" instead of "الملقا"
Frontend displays: "حي حي الملقا" (double حي prefix)
Area filter shows inconsistent grouping
```

**Trigger:** Any admin data entry mistake.

**Impact:** Broken UI, inconsistent filtering, confusing for users.

**Severity:** Medium (happens periodically, manually fixable)

---

## Risk 4: Python-Side Search Won't Scale

**What:** Both mosque search and nearby sort load ALL records into Python memory, then filter/sort.

**Current:** 118 mosques × ~500 bytes = ~59 KB per request. Trivial.

**At 1,000 mosques:** ~500 KB per request. Still manageable.

**At 10,000 mosques (multi-city):** ~5 MB per request. Memory pressure, slow response times.

**Trigger:** Expansion to multiple cities (Jeddah, Makkah, Madinah, Dammam — listed in Future Ideas).

**Severity:** Low (current scale) / High (if multi-city expansion happens)

---

## Risk 5: No Notification System for Transfer Results

**What:** Users submit transfer requests and must manually check their profile to see the outcome.

**Scenario:**
```
User reports imam change → waits days → forgets → never checks
Admin approves/rejects → user never knows
```

**Impact:** Low engagement with the transfer system. Users may not realize their contributions are valued.

**Severity:** Medium (UX impact, not technical)

---

## Risk 6: Hardcoded Ramadan Dates

**What:** `lib/arabic-utils.ts` contains hardcoded Ramadan 1447 dates.

**Scenario:** Ramadan 1448 arrives. Countdown shows wrong dates. Night numbering is off.

**Trigger:** Every year, automatically.

**Impact:** Incorrect date display until code is manually updated.

**Severity:** Low (predictable, annual fix)

---

## Risk 7: Firebase Token Verification on Every Request

**What:** Every authenticated API call verifies the Firebase token server-side, including a revocation check.

**Scenario:** Firebase Admin SDK makes a network call to Google servers on each verification (for revocation check).

**Impact:** Added latency on every authenticated request. If Google's servers are slow or unreachable, authenticated endpoints fail.

**Trigger:** Google server latency or outage.

**Mitigation:** `check_revoked=True` could be changed to `False` for performance, with periodic revocation checks instead.

**Severity:** Low (Firebase is highly available)

---

## Risk 8: No CORS Configuration

**What:** No Flask-CORS is configured. The app relies on same-origin policy (React served from same Flask server).

**Scenario:** If the frontend is ever hosted on a different domain (CDN, Vercel, etc.), API calls will be blocked by browser CORS policy.

**Trigger:** Architecture change to separate frontend hosting.

**Severity:** Low (only relevant if architecture changes)

---

## Risk 9: Email as Error Reporting Channel

**What:** Error reports (data corrections) are sent via email to `info@taraweeh.org`. No database record, no tracking, no status.

**Scenario:**
```
User reports wrong imam at mosque X
Email arrives → admin reads → admin forgets
Same user reports again → another email → no dedup
```

**Impact:** Error reports get lost. No way to track resolution. No user feedback.

**Severity:** Medium (impacts data quality)

---

## Risk 10: No Backup Strategy Documented

**What:** No documented backup strategy for the PostgreSQL database.

**Heroku provides:** Automatic daily backups with Standard plan, but rollback procedures aren't documented.

**Trigger:** Accidental data deletion, admin error, migration gone wrong.

**Severity:** Medium

---

## Risk 11: Single Admin Account

**What:** Only one admin user, credentials set via environment variables. No admin user management.

**Scenario:** If admin password is compromised, there's no way to revoke access without redeploying with new env vars.

**Impact:** No audit trail per admin action, no role separation, no multi-admin support.

**Severity:** Low (single-developer project currently)

---

## Risk 12: Service Worker Cache Staleness

**What:** PWA caches API responses for 24 hours (NetworkFirst strategy). If network is unavailable, stale data is served.

**Scenario:** User installs PWA, goes offline for a day. Imam has changed. User sees old imam data from cache.

**Impact:** Stale data shown to offline users.

**Mitigation:** NetworkFirst means fresh data is always preferred when online. Only an issue for offline users.

**Severity:** Low

---

## Risk Matrix Summary

| Risk | Likelihood | Impact | Severity |
|------|-----------|--------|----------|
| Single-file backend | Certain | High | **High** |
| Cache inconsistency | Likely | Medium | **Medium** |
| No DB validation | Likely | Medium | **Medium** |
| Search scalability | Low (current) | High (future) | **Low/High** |
| No transfer notifications | Certain | Medium | **Medium** |
| Hardcoded Ramadan dates | Certain (annual) | Low | **Low** |
| Firebase token latency | Unlikely | Medium | **Low** |
| No CORS | Only if architecture changes | High | **Low** |
| Email error reports | Likely | Medium | **Medium** |
| No backup docs | Unlikely but catastrophic | High | **Medium** |
| Single admin | Low | Medium | **Low** |
| SW cache staleness | Moderate | Low | **Low** |
