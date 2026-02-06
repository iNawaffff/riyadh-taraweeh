# Imam Transfer Workflow (Current State)

> **Purpose:** Crowdsourced mechanism for users to report when an imam changes mosques.
> **Backend:** `app.py` lines 1410–1549
> **Frontend:** `TransferDialog.tsx`, `use-transfers.ts`, `ProfilePage.tsx`

---

## State Machine

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
       │  approved   │          │  rejected   │
       └─────────────┘          └─────────────┘

User can DELETE (cancel) only while status = "pending"
No other transitions exist. States are terminal once approved/rejected.
```

**Status values:** `"pending"` | `"approved"` | `"rejected"` (stored as String(20))

---

## Complete Lifecycle

### Step 1: User Initiates Transfer Report

**Trigger:** User taps "تغيّر؟" (Changed?) next to imam name on MosqueDetailPage.

**Frontend:**
1. If not authenticated → show LoginDialog first
2. Open `TransferDialog` (lazy-loaded)
3. User searches for new imam via `useImamSearch` hook
4. User selects existing imam from search results OR types a new imam name
5. Optional: add notes field
6. Submit

**API Call:**
```
POST /api/transfers
Authorization: Bearer <firebase_token>
Rate Limit: 10 per minute

Body: {
  "mosque_id": 42,
  "new_imam_id": 15,         // OR null if typing new name
  "new_imam_name": "الشيخ فلان",  // OR null if selecting existing
  "notes": "بدأ يصلي من يوم الجمعة"     // optional
}
```

**Backend Validation:**
1. User must be registered (`g.current_public_user` exists)
2. Mosque must exist (`Mosque.query.get(mosque_id)`)
3. Must provide `new_imam_id` OR `new_imam_name` (not both empty)
4. **Duplicate check:** No pending transfer by same user for same mosque
   - Query: `ImamTransferRequest.query.filter_by(submitter_id=user.id, mosque_id=mosque_id, status="pending")`
   - Uses composite index: `ix_transfer_submitter_mosque_status`
   - Returns 409 if duplicate exists: "لديك بلاغ معلق لهذا المسجد"

**Record Creation:**
```python
tr = ImamTransferRequest(
    submitter_id=user.id,
    mosque_id=mosque_id,
    current_imam_id=current_imam.id if current_imam else None,
    new_imam_id=new_imam_id if new_imam_id else None,
    new_imam_name=new_imam_name,
    notes=notes or None,
    # status defaults to "pending"
    # created_at defaults to utcnow
)
```

**Response:** `{"id": 123, "status": "pending"}` (201 Created)

---

### Step 2: User Views Their Transfers

**Frontend:** ProfilePage → Contributions section (own profile only)

**API Call:**
```
GET /api/user/transfers
Authorization: Bearer <firebase_token>

Response: [
  {
    "id": 123,
    "mosque_id": 42,
    "mosque_name": "جامع الراجحي",
    "current_imam_name": "الشيخ خالد الجليل",
    "new_imam_name": "الشيخ فلان",
    "notes": "بدأ يصلي من يوم الجمعة",
    "status": "pending",
    "reject_reason": null,
    "created_at": "2026-02-05T18:30:00",
    "reviewed_at": null
  }
]
```

**Display:** Status badges with colors:
- Pending: yellow/amber badge
- Approved: green badge
- Rejected: red badge with rejection reason shown

---

### Step 3: User Can Cancel Pending Transfer

**Frontend:** Cancel button on pending transfer in ProfilePage

**API Call:**
```
DELETE /api/transfers/123
Authorization: Bearer <firebase_token>
```

**Validation:**
- Must be the submitter
- Must be status = "pending"
- Returns 400 if already reviewed: "لا يمكن إلغاء بلاغ تمت مراجعته"

**Effect:** Record is deleted from database entirely (not soft-deleted).

---

### Step 4: Admin Reviews Transfer

**Where:** Flask-Admin panel (`/admin/imamtransferrequest/`) or API endpoints

#### Approve Flow

**API:** `POST /api/transfers/123/approve` (Flask-Login required)

**Business Logic:**
```
1. Validate: status must be "pending"

2. Unassign old imam:
   old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
   if old_imam:
       old_imam.mosque_id = None  ← imam becomes unassigned

3. Assign new imam:
   if transfer.new_imam_id:
       # Existing imam: move to this mosque
       new_imam = Imam.query.get(transfer.new_imam_id)
       new_imam.mosque_id = mosque.id
   elif transfer.new_imam_name:
       # New imam: create record
       new_imam = Imam(name=transfer.new_imam_name, mosque_id=mosque.id)
       db.session.add(new_imam)

4. Award point (atomic SQL increment):
   submitter.contribution_points = PublicUser.contribution_points + 1

5. Update transfer record:
   transfer.status = "approved"
   transfer.reviewed_at = datetime.utcnow()
   transfer.reviewed_by = current_user.id

6. Commit transaction

7. Invalidate caches:
   _imam_index_cache = None
   _api_response_cache.clear()
```

**Side Effects:**
- Old imam is unassigned (mosque_id = NULL), NOT deleted
- New imam created if name provided (no audio/youtube at creation time)
- Submitter gets +1 contribution point
- All API caches cleared

#### Reject Flow

**API:** `POST /api/transfers/123/reject` (Flask-Login required)

```
Body: { "reason": "الإمام لم يتغير" }  // optional
```

**Business Logic:**
```
1. Validate: status must be "pending"
2. transfer.status = "rejected"
3. transfer.reject_reason = reason or None
4. transfer.reviewed_at = datetime.utcnow()
5. transfer.reviewed_by = current_user.id
6. Commit
```

**No side effects:** No imam changes, no points awarded.

---

## Imam Search (for Transfer Dialog)

### Frontend

```typescript
// TransferDialog.tsx
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

### Prefix Stripping

Before matching, these prefixes are removed:
- الشيخ (The Sheikh)
- شيخ (Sheikh)
- الامام (The Imam)
- امام (Imam)
- ال (The) — from each word

---

## Data Flow Diagram

```
┌────────────┐     POST /api/transfers      ┌──────────────────┐
│   User     │ ──────────────────────────→   │  Database:       │
│ (Frontend) │                               │  imam_transfer_  │
│            │     GET /api/user/transfers    │  request         │
│            │ ←──────────────────────────    │  status="pending"│
└────────────┘                               └────────┬─────────┘
                                                      │
                                                      │ Admin reviews
                                                      ▼
                                             ┌──────────────────┐
                                             │   Admin Panel    │
                                             │  /admin/ or API  │
                                             └────────┬─────────┘
                                                      │
                                    ┌─────────────────┴─────────────────┐
                                    ▼                                   ▼
                           ┌────────────────┐                  ┌────────────────┐
                           │    APPROVE     │                  │    REJECT      │
                           ├────────────────┤                  ├────────────────┤
                           │ 1. Unassign    │                  │ 1. Set status  │
                           │    old imam    │                  │    "rejected"  │
                           │ 2. Assign new  │                  │ 2. Save reason │
                           │    imam        │                  │ 3. Set review  │
                           │ 3. +1 point   │                  │    timestamp   │
                           │ 4. Clear cache │                  └────────────────┘
                           └────────────────┘
```

---

## Edge Cases & Limitations

1. **Multiple pending for different mosques:** Allowed. User can submit transfers for mosque A and mosque B simultaneously.

2. **Multiple pending for same mosque:** Blocked. Returns 409.

3. **Imam already moved before approval:** The old imam assignment is whatever is current at approval time, not at submission time. The `current_imam_id` on the record is a snapshot.

4. **New imam name without audio:** When admin approves a transfer with `new_imam_name`, the new Imam record is created with only a name — no `audio_sample` or `youtube_link`. Admin must add these later.

5. **Cancelled transfers:** Hard-deleted from database. No audit trail.

6. **Race condition on points:** Handled via SQL-level atomic increment (`contribution_points + 1`), not Python-level read-modify-write.

7. **No notification system:** User must check their profile to see if transfer was approved/rejected. No push notification, email, or in-app notification.
