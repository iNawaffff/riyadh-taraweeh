# Gamification System

> **Purpose:** Incentivize crowdsourced imam data updates via contribution points and leaderboard.

---

## Contribution Points

### How Points Are Earned

```
User submits imam transfer request → status: "pending" (0 points)
  │
  ▼ Admin reviews
  │
  ├─→ Approved → submitter gets +1 contribution_points
  └─→ Rejected → no points awarded
```

**Atomic increment** (race-condition safe):
```python
submitter.contribution_points = PublicUser.contribution_points + 1
# This generates SQL: UPDATE public_user SET contribution_points = contribution_points + 1
# NOT: SET contribution_points = <python_value + 1>
```

### Where Points Are Displayed

1. **Leaderboard page** (`/leaderboard`) — top 20 users by points
2. **User profile** (`/u/<username>`) — contribution points stat card
3. **Profile page contributions section** — list of transfer requests with status

---

## Leaderboard (`/api/leaderboard`)

### Backend Logic

```python
# Query: top 20 users with contribution_points > 0, ordered descending
users = PublicUser.query.filter(
    PublicUser.contribution_points > 0
).order_by(
    PublicUser.contribution_points.desc()
).limit(20).all()

# Pioneer: first user to ever get an approved transfer
pioneer = db.session.query(ImamTransferRequest.submitter_id).filter(
    ImamTransferRequest.status == "approved"
).order_by(ImamTransferRequest.reviewed_at.asc()).first()
```

### Response Format

```json
[
  {
    "username": "nawaf",
    "display_name": "نواف",
    "avatar_url": "https://...",
    "points": 5,
    "is_pioneer": true
  },
  ...
]
```

### Frontend Display (LeaderboardPage.tsx)

#### Top 3 Podium

| Rank | Color | Icon | Card Style |
|------|-------|------|-----------|
| 1st | Gold (`#fbbf24`) | Heart | Large card, gold gradient, crown animation |
| 2nd | Silver (`#9ca3af`) | Medal | Medium card, gray gradient |
| 3rd | Bronze (`#f59e0b`) | Award | Medium card, amber gradient |

Each card shows: avatar, name, username, contribution count, pioneer badge

#### Ranks 4–20

Compact list with numbered rank badge, avatar, name, username, contribution count.

#### Animations

- Staggered slide-in-right entrance
- Count-up animation on contribution badges
- Crown bounce on 1st place (0.6s)

---

## Pioneer Badge

### Definition

The **pioneer** (رائد) is the first user to ever get an approved imam transfer request.

### Determination

```python
pioneer = db.session.query(ImamTransferRequest.submitter_id).filter(
    ImamTransferRequest.status == "approved"
).order_by(ImamTransferRequest.reviewed_at.asc()).first()
```

Determined fresh on each `/api/leaderboard` call — not stored as a flag.

### Display

- **Leaderboard:** Gold "رائد" badge next to name
- **Profile page:** Pioneer badge next to display name (shown for top 5 contributors in frontend logic)

---

## First Contribution Celebration

### Trigger

When a user visits their profile and has at least 1 approved contribution that hasn't been celebrated yet.

### Frontend Logic (ProfilePage.tsx)

```typescript
// Check localStorage for celebration flag
const celebrated = localStorage.getItem('celebrated_first_contribution')

// If user has approved transfers AND hasn't been celebrated
if (hasApprovedTransfer && !celebrated) {
    // Show confetti animation
    // Show success toast with duaa message
    localStorage.setItem('celebrated_first_contribution', 'true')
}
```

### Visual Effects

1. **Confetti particles** — CSS animation, 1.8–3.3 second fall
2. **Celebration pop toast** — Custom success toast with premium styling
3. **One-time only** — localStorage flag prevents repeat celebrations

---

## Spiritual Tone (Design Decision)

The leaderboard was deliberately redesigned with a spiritual, humble tone:

| Aspect | Before | After |
|--------|--------|-------|
| Page title | المتصدرون (The Leaders) | المساهمون (The Contributors) |
| Points label | نقاط (Points) | مساهمات (Contributions) |
| Icon | Trophy/Crown | HandHeart |
| CTA message | — | "كل تحديث صحيح صدقة جارية" (Every correct update is ongoing charity) |
| Pioneer label | — | رائد (Pioneer) |

This reflects the Islamic context where good deeds should be done humbly, not competitively.

---

## Unauthenticated Users

On the leaderboard page, unauthenticated users see:
- A call-to-action card at the bottom
- Message: "كل تحديث صحيح صدقة جارية" (Every correct update is ongoing charity)
- Sign-in button linking to login dialog

---

## Points Economy Summary

| Action | Points |
|--------|--------|
| Submit transfer request | 0 |
| Transfer approved | +1 |
| Transfer rejected | 0 |
| Cancel transfer | 0 |
| Multiple approved for same mosque | +1 each |

There is no point deduction mechanism. Points only increase.
