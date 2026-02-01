# Riyadh Taraweeh — Project Status & Analysis

## Current State Overview

### What Non-Authenticated Users Can Do
- Browse all mosques with search + area filter + district (حي) filter
- Sort by proximity (geolocation)
- View individual mosque detail pages
- Listen to imam audio samples (floating player)
- View public user profiles (`/u/username`)
- Report errors on mosque data
- Visit About/Contact pages

### What Authenticated Users Get (additionally)
- Favorite mosques (heart button, synced to server)
- Favorites page (`/favorites`) with area + district filters
- Taraweeh tracker — 30-night attendance grid (`/tracker`)
- Share achievements / profile
- Tracker link in mobile menu
- User menu with avatar in header

---

## Feature Assessment

### Working Well
- Arabic RTL implementation is solid throughout
- Search with Arabic normalization + debounce
- Audio player with floating bar, seek, progress
- Optimistic updates on favorites and tracker
- Responsive Dialog/Drawer pattern for auth
- Loading skeletons instead of spinners
- SEO meta tag injection per route
- Firebase auth with Google + Phone/OTP

### Issues & Gaps

#### UI/Design
- ~~Header says "رمضان ١٤٤٦ هـ" — should be **١٤٤٧**~~ ✅ Fixed
- ~~Footer also says "رمضان ١٤٤٦ هـ"~~ ✅ Fixed
- Mosque cards are dense — many interactive elements packed tightly, especially on small phones
- No dark mode (Ramadan-themed dark mode would be fitting)
- Tracker tile dates at `text-[9px]` are hard to read on mobile
- No visual distinction between "browsing as guest" vs "logged in" beyond the header button swap

#### UX Flow
- ~~`fetchMosqueById()` fetches **all** mosques to find one — no dedicated `/api/mosques/:id` endpoint~~ ✅ `/api/mosques/<id>` exists
- UsernameSetup modal is non-dismissible — user is trapped if they just want to browse after Google sign-in
- Clicking favorite as guest shows login dialog, but there's no "after login, auto-favorite" flow — the intent is lost
- No onboarding or explanation of features for new visitors
- Proximity success state disappears after 2 seconds — easy to miss
- No pagination or infinite scroll if mosque list grows

#### Missing Features
- ~~No district/neighborhood filter~~ ✅ Added — area + district (حي) dropdowns on HomePage and FavoritesPage
- No "remember favorite intent" after login — user clicks heart, logs in, then has to click again
- No sorting options — only proximity; could add alphabetical, by area grouping
- No offline/PWA caching of favorites — PWA is configured but favorites require network
- No notification or reminder — e.g., "you haven't marked tonight's taraweeh"
- No social proof — how many people favorited a mosque, how many are tracking
- Profile page doesn't show tracker — only shows favorites, not attendance progress
- No imam detail or comparison — can't browse by imam, compare reciters
- Contact page lacks a form — only shows email/Twitter, no inline submission
- Tracker doesn't track rakaat count per night

#### Code Quality
- ~~`toArabicNum` helper is duplicated~~ ✅ Extracted to shared utils
- ~~`getRamadanInfo` logic in HeroBanner~~ ✅ Extracted to shared utility
- `useMemo` used for side effects in HomePage (proximity success timer) — should be `useEffect`
- `authFetch` only wraps tracker calls; favorites in FavoritesContext still use raw `fetch`

---

## Priority Recommendations

### Quick Fixes (polish)
1. ~~Fix "١٤٤٦" → "١٤٤٧" in Header and Footer~~ ✅ Done
2. ~~Extract `toArabicNum` and `getRamadanInfo` to shared utils~~ ✅ Done
3. Use `authFetch` in FavoritesContext too
4. ~~Add `/api/mosques/:id` backend endpoint~~ ✅ Done

### UX Improvements
5. Allow dismissing UsernameSetup (let users browse first)
6. Remember favorite intent through login flow
7. Show tracker progress on public profile page
8. Increase tracker tile date font size slightly
9. Add rakaat count to tracker (after marking attendance, prompt for number of rak'ahs)

### Bigger Features
10. Dark mode with Ramadan night theme
11. Browse/filter by imam
12. Daily reminder (push notification or in-app)
13. Inline contact form
14. Social proof badges on mosque cards

---

## Taraweeh — Domain Knowledge

### What is Taraweeh?

صلاة التراويح (Taraweeh) is a **sunnah mu'akkadah** (strongly recommended) prayer performed every night during Ramadan, after Isha prayer until Fajr. It is not obligatory (fard) but carries immense reward.

**The Prophet ﷺ said:** "من قام رمضان إيمانًا واحتسابًا غُفر له ما تقدم من ذنبه"
("Whoever stands in prayer during Ramadan out of faith and seeking reward, his previous sins will be forgiven.")

The name "التراويح" comes from "الترويحة" (rest), because worshippers would rest between every four rak'ahs due to the length of the prayer.

### Number of Rak'ahs

- **Most authentic practice:** 11 or 13 rak'ahs (as reported by Aisha رضي الله عنها about the Prophet's practice)
- **Permissible range:** Sheikh Ibn Baz stated there is no fixed limit — 11, 13, 20, or 23 are all valid
- **In the Haramain (Makkah & Madinah):** 20 rak'ahs of Taraweeh plus 3 Witr = 23 total

### Taraweeh vs Tahajjud (التهجد) — The Last 10 Nights

During the **last 10 nights** of Ramadan (العشر الأواخر), mosques in Saudi Arabia split the night prayer into two sessions:

| Session | Time | Name | Character |
|---------|------|------|-----------|
| First | After Isha | التراويح (Taraweeh) | ~10 rak'ahs, moderate pace |
| Second | Last third of night | التهجد / القيام (Tahajjud/Qiyam) | ~10 rak'ahs + Witr, longer recitation |

This split is done to maximize worship in the blessed final nights and to seek **Laylat al-Qadr** (ليلة القدر) — the Night of Decree, which is better than a thousand months.

**The Prophet ﷺ in the last 10 nights:** "أحيا ليله، وأيقظ أهله، وشدّ مئزره" — He would stay up all night, wake his family, and strive hard in worship.

### Ramadan 1447 / 2026 in Saudi Arabia

- **Expected start:** Thursday, February 19, 2026 (pending moon sighting on Wed Feb 18)
- **Duration:** 29 or 30 nights
- **Expected end:** Around March 19-20, 2026
- **Eid al-Fitr:** Around March 20-21, 2026
- The Haramain schedule for 1447 has not been announced yet

### The Riyadh Taraweeh Scene

Riyadh has a vibrant Taraweeh culture with famous mosques known for their imams' recitation styles. People travel across the city to pray behind specific imams. Key mosques include:

| Mosque | Area | Known Imam |
|--------|------|------------|
| جامع الملك خالد | غرب الرياض | الشيخ خالد الجليل |
| جامع الراجحي | شرق الرياض | الشيخ ناصر العصفور |
| جامع الشيخ ناصر الناصر | شرق الرياض | الشيخ محمد اللحيدان |
| جامع الحكمة | شمال الرياض | الشيخ سلطان العمري |
| جامع السلمان | شمال الرياض | الشيخ خالد العبودي |
| جامع عثمان الرشيد | غرب الرياض | الشيخ سعود آل الجمعة |

This is exactly the problem our app solves — helping people **discover imams**, **listen to samples**, and **find the nearest mosque** for a meaningful Taraweeh experience.

### Competitive Landscape — Existing Apps

| App | Focus | Relevant Features |
|-----|-------|-------------------|
| **Khatmah (ختمة)** | Quran completion | Daily wird tracker, Quran reading schedule, history log |
| **Muslim Pro** | All-in-one Islamic | Prayer times, Quran, Ramadan journal, fasting tracker, mosque finder |
| **Athan (IslamicFinder)** | Prayer times | Prayer logging, Ramadan calendar, fasting badge system |
| **Pillars** | Privacy-first prayer | Ad-free, fasting tracker, local-only data |
| **Masjidbox** | Mosque management | Prayer/Taraweeh times, events, donations, announcements |
| **Islamic Habit Tracker** | Daily habits | Prayer tracking, Quran progress, custom Islamic habits |

**What none of them do well:**
- None focus specifically on **Taraweeh imam discovery** with audio samples
- None offer a **city-specific mosque directory** for Taraweeh
- None combine **imam audio preview + proximity sorting + attendance tracking**

### Our Unique Value Proposition

**"Listen before you go"** — We're the only platform where users can:
1. Preview an imam's recitation style before choosing a mosque
2. Find the nearest mosque with a specific reciter
3. Track their Taraweeh attendance across the 30 nights
4. Share their Ramadan prayer journey with others

---

## Feature Ideas Inspired by Domain Knowledge

### High Impact (aligned with how Saudis use Taraweeh)

1. **Last 10 Nights Mode** — Special UI/data for العشر الأواخر:
   - Show which mosques offer Tahajjud (second session)
   - Tahajjud imam may differ from Taraweeh imam — show both
   - Highlight odd nights (21, 23, 25, 27, 29) for Laylat al-Qadr
   - Tracker could distinguish Taraweeh vs Tahajjud attendance



### Medium Impact


2. **Offline Mode** — Cache mosque list and favorited audio:
    - Critical for low-connectivity areas or inside mosques

### Lower Priority (nice to have)

3. **Yearly Archive** — Keep previous Ramadan data:
    - "In Ramadan 1446, you attended 22 nights"
    - Compare year over year


4. **Multi-City Expansion** — Jeddah, Makkah, Madinah, Dammam

---

## Sources

- [إمساكية رمضان 2026 الرياض](https://sa.prayertimes.news/ramadan/riyadh.html)
- [موعد رمضان 2026 السعودية — المصري اليوم](https://www.almasryalyoum.com/news/details/4172302)
- [عدد ركعات التراويح — الشيخ ابن باز](https://binbaz.org.sa/fatwas/4335/)
- [صلاة التراويح مشروعيتها — إسلام ويب](https://www.islamweb.net/ar/fatwa/11872/)
- [الفرق بين التراويح والقيام — الشيخ ابن باز](https://binbaz.org.sa/fatwas/4354/)
- [التراويح والتهجد العشر الأواخر — وكالة الأنباء السعودية](https://spa.gov.sa/N2076331)
- [جدول أئمة الحرم المكي 1446 — رئاسة شؤون الحرمين](https://prh.gov.sa/)
- [Best Ramadan Apps 2026 — Greentech Apps](https://gtaf.org/blog/best-apps-for-ramadan-for-android-and-ios/)
