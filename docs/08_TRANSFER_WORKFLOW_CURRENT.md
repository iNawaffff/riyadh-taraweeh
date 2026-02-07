# Imam Change Workflow (Current State)

> **Purpose:** Crowdsourced mechanism for users to report when an imam changes at a mosque.
> **Backend:** `app.py` — Community Request API (`/api/requests`)
> **Frontend:** `TransferDialog.tsx`, `RequestPage.tsx`, `use-requests.ts`

---

## How It Works (Simple Version)

There are **two ways** a user can report an imam change:

1. **From the mosque detail page** — click "تغيّر؟" next to the imam name → opens `TransferDialog`
2. **From the request page** (`/request`) — choose "تغيير إمام" → fill out the form

Both paths submit to the **same backend API**: `POST /api/requests` (the community request system).

> **Important:** There used to be a separate "transfer" API (`POST /api/transfers`). That old system still exists in the codebase but is no longer used by any frontend component. All new imam change reports go through the community request pipeline.

---

## Two Parallel Systems (Legacy Context)

| | Old Transfer System | New Community Request System |
|---|---|---|
| **API** | `POST /api/transfers` | `POST /api/requests` |
| **Model** | `ImamTransferRequest` | `CommunityRequest` |
| **Admin review** | `/dashboard/transfers` | `/dashboard/requests` |
| **Status** | Still works (backend endpoints exist) | **Active — all new reports go here** |
| **Frontend usage** | None (no component calls it anymore) | `TransferDialog`, `RequestPage` |

The old `/dashboard/transfers` admin page is still accessible by direct URL for reviewing any old pending transfers, but it's been **removed from the sidebar navigation**.

---

## State Machine

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       ┌─────────────┐ ┌──────────┐ ┌─────────────┐
       │  approved   │ │needs_info│ │  rejected   │
       └─────────────┘ └──────────┘ └─────────────┘

User can CANCEL while status = "pending" or "needs_info"
```

**Status values:** `"pending"` | `"approved"` | `"rejected"` | `"needs_info"`

This is the `CommunityRequest` model — it supports more statuses than the old transfer system.

---

## User Flow: TransferDialog (Mosque Detail Page)

### What the user sees

1. User visits a mosque detail page (e.g., `/mosque/42`)
2. Next to the imam name, there's a "تغيّر؟" (Changed?) button
3. Clicking it opens `TransferDialog` (a Drawer on mobile, Dialog on desktop)
4. The user either:
   - **Searches for an existing imam** on the platform (default mode)
   - **Adds a new imam name** by clicking "الإمام غير موجود بالنظام؟ أضف اسمه"
5. In "new imam" mode, there's also an optional YouTube link field
6. User submits

### What the frontend sends

The `TransferDialog` calls `useSubmitRequest()` (from `use-requests.ts`), NOT the old `useSubmitTransfer()`.

**If user picked an existing imam (search mode):**
```json
{
  "target_mosque_id": 42,
  "request_type": "imam_transfer",
  "imam_source": "existing",
  "existing_imam_id": 15,
  "notes": "optional notes"
}
```

**If user typed a new imam name (create mode):**
```json
{
  "target_mosque_id": 42,
  "request_type": "new_imam",
  "imam_source": "new",
  "imam_name": "الشيخ محمد العبدالله",
  "imam_youtube_link": "https://youtube.com/...",
  "notes": "optional notes"
}
```

> **Key insight:** The user doesn't choose between "new_imam" and "imam_transfer" — the frontend decides based on whether they searched for an existing imam or typed a new name.

### Error handling

- If the user already has a pending request for this mosque → backend returns 409 → toast: "لديك طلب معلق مشابه لهذا المسجد"

---

## User Flow: RequestPage (`/request`)

### What the user sees

The `/request` page shows **2 request types** (radio cards):

1. **مسجد جديد** — Add a mosque not in the directory
2. **تغيير إمام** — Report an imam change at an existing mosque

> **Note:** There used to be 3 types (مسجد جديد / إمام جديد / نقل إمام). These were merged into 2 because from a user's perspective, "new imam" and "imam transfer" are the same action: "this mosque has a different imam now."

### "تغيير إمام" form flow

1. **Pick a mosque** — combobox search with all mosques from the platform
2. **Current imam displayed** — after picking a mosque, a blue info box shows the current imam (if any)
3. **Pick the new imam** — defaults to searching existing imams (combobox)
4. **Toggle:** "الإمام غير موجود؟ أضف اسمه" switches to:
   - Text input for imam name
   - Optional YouTube link input
5. **Toggle back:** "البحث في الأئمة الموجودين" switches back to search
6. Submit

### The `imam_change` UI type

The frontend uses `imam_change` as an internal UI type — **it's never sent to the backend**. The `handleSubmit` function maps it:

- `imam_change` + existing imam selected → sends `request_type: "imam_transfer"` to backend
- `imam_change` + new imam name typed → sends `request_type: "new_imam"` to backend

This mapping happens in `RequestPage.tsx`:

```typescript
if (requestType === 'imam_change') {
  if (imamMode === 'existing') {
    data.request_type = 'imam_transfer'   // ← backend value
    data.imam_source = 'existing'
    data.existing_imam_id = changeExistingImamId
  } else {
    data.request_type = 'new_imam'        // ← backend value
    data.imam_source = 'new'
    data.imam_name = changeImamName.trim()
  }
}
```

---

## Admin Review

All imam change requests (from both TransferDialog and RequestPage) are reviewed at:

**`/dashboard/requests`** (the community requests admin page)

The admin sees:
- Both `new_imam` and `imam_transfer` types displayed as "تغيير إمام"
- The `imam_source` field tells them whether it's an existing or new imam
- They can approve, reject, or ask for more info ("needs_info")

The admin sidebar badge shows the count of pending + needs_info community requests.

### Dashboard stat card

The "طلبات معلقة" (pending requests) stat card on `/dashboard` counts `CommunityRequest` records with status `pending` or `needs_info`. This replaced the old "بلاغات معلقة" card that counted `ImamTransferRequest` records.

---

## Imam Search (Shared Between Both Flows)

Both `TransferDialog` and `RequestPage` use `useImamSearch()` from `use-transfers.ts` for searching existing imams.

### Frontend
```typescript
const [searchQuery, setSearchQuery] = useState("")
const debouncedQuery = useDebounce(searchQuery, 300)  // 300ms debounce
const { data: searchResults } = useImamSearch(debouncedQuery)
```

### Backend (`/api/imams/search`)

Multi-tier scoring algorithm with in-memory cached index:

```
1. Build index: query all imams with mosques, normalize names
2. For each imam, compute score against search query:
   - Tier 1 (100-95): exact/prefix match
   - Tier 2 (90): stripped prefix match
   - Tier 3 (80-75): substring containment
   - Tier 4 (70-65): word-start matching
   - Tier 5 (75-55): multi-word ratio matching
   - Tier 6 (40-60): bigram fuzzy similarity
3. Return top 15 by score
```

---

## MyRequestsPage (`/my-requests`)

Users see their request history here. Both `new_imam` and `imam_transfer` request types display as **"تغيير إمام"** with a `RefreshCw` icon — the user doesn't need to know the internal distinction.

---

## Files Involved

| File | Role |
|------|------|
| `frontend/src/components/mosque/TransferDialog.tsx` | Dialog/Drawer on mosque detail page |
| `frontend/src/pages/RequestPage.tsx` | Full request form at `/request` |
| `frontend/src/pages/MyRequestsPage.tsx` | User's request history |
| `frontend/src/pages/admin/RequestsPage.tsx` | Admin review page |
| `frontend/src/hooks/use-requests.ts` | `useSubmitRequest()` mutation hook |
| `frontend/src/hooks/use-transfers.ts` | `useImamSearch()` hook (still used) |
| `frontend/src/lib/requests-api.ts` | API client for community requests |
| `app.py` (line ~1538) | `POST /api/requests` endpoint |
| `models.py` (line ~95) | `CommunityRequest` model |

---

## Edge Cases

1. **Duplicate detection:** Backend checks for existing pending request by same user + same type + same mosque. Returns 409 if found.

2. **New imam via TransferDialog has no audio:** When admin approves, the new Imam record is created with only a name (+ optional YouTube link). Admin must add audio later.

3. **Current imam snapshot:** The "current imam" shown in the info box is whatever is current at page load time, not necessarily at approval time.

4. **Old transfer system still works:** The old `POST /api/transfers` endpoint and admin page at `/dashboard/transfers` still exist. They're just not linked from any UI. Once all old pending transfers are processed, they can be removed.
