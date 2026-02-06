# Media Pipeline

> **Audio storage:** Local filesystem (`static/audio/`) + AWS S3 (`imams-riyadh-audio`)
> **Images:** Local filesystem (`static/images/`)

---

## Audio Storage (Dual System)

### 1. Local Audio Files (`/static/audio/`)

27 MP3 files committed to the git repository:

```
static/audio/
├── abdulaziz-aldamgh.mp3
├── abdulaziz-altamimi.mp3
├── abdulaziz-alturky.mp3
├── abdulaziz-alwathlan.mp3
├── abdulaziz-assiri.mp3
├── abdulelah-bin-aon.mp3
├── abdullah-alhasn.mp3
├── abdullah-almansor.mp3
├── abdullah-almeshal.mp3
├── abdulrahman-alhussain.mp3
├── abdulrahman-almajed.mp3
├── ahmad-alobaidi.mp3
├── ahmad-alsuwailim.mp3
├── doufhr-alqalib.mp3
├── ibrahim-alasiri.mp3
├── ibrahim-alhaidri.mp3
├── ibrahim-alsaif.mp3
├── ibrahim-alshutairi.mp3
├── ibrahim-alzabedi.mp3
├── ibrahim-assiri.mp3
├── khalid-aloboudy.mp3
├── khalidaljaleel.mp3
├── majed-alhazmi.mp3
├── mohammed-alazoni.mp3
├── sami-alsalmi.mp3
├── saud-alhamdan.mp3
└── tariq-almuhassiny.mp3
```

**Naming convention:** `firstname-lastname.mp3` (romanized, lowercase, hyphenated)

**Served at:** `/static/audio/<filename>.mp3`
- Cache-Control: `public, max-age=604800` (7 days)
- PWA cache: CacheFirst, 7-day TTL, max 30 entries

### 2. S3 Audio Files

**Bucket:** `imams-riyadh-audio`
**Region:** `eu-north-1` (default)
**ACL:** `public-read`

**Upload path:** `audio/{uuid}.{extension}`
- UUID generated at upload time
- Extension preserved from original file

**URL format:** `https://imams-riyadh-audio.s3.us-east-1.amazonaws.com/audio/{uuid}.mp3`

**PWA cache:** CacheFirst, 7-day TTL, max 50 entries, **range request support enabled** (for audio seeking)

### How Audio URLs Are Referenced

The `imam.audio_sample` column stores one of:
1. **Local path:** `abdulaziz-aldamgh.mp3` (just the filename)
2. **S3 URL:** `https://imams-riyadh-audio.s3.us-east-1.amazonaws.com/audio/{uuid}.mp3`
3. **NULL:** No audio available

**Frontend resolution logic** (AudioContext):
```
if url starts with "http"  → use as-is (S3)
if url starts with "/static/" → use as-is (local with path)
else → prepend "/static/audio/" (local filename only)
```

---

## Audio Upload Flow

### Via New Admin Panel (React — Recommended)

The new admin panel at `/dashboard/mosques/new` or `/dashboard/mosques/:id/edit` includes an integrated audio pipeline:

```
1. Admin pastes YouTube/Twitter URL in AudioPipeline component
2. Clicks "استخراج" (Extract)
3. Backend: POST /api/admin/audio/extract
   → yt-dlp extracts audio → saves to temp file → returns temp_id + duration_ms
4. Frontend loads temp audio into wavesurfer.js waveform
5. Admin drags region handles to select ~40s segment
6. Admin clicks "معاينة المقطع" to preview selected region
7. Admin clicks "رفع إلى S3" (Upload to S3)
8. Backend: POST /api/admin/audio/trim-upload
   → ffmpeg trims temp file → uploads to S3 → returns s3_url
9. S3 URL auto-fills the imam's audio_sample field in MosqueForm
```

**Dependencies:**
- `yt-dlp` (pip) — audio extraction from YouTube, Twitter/X
- `ffmpeg` (system/buildpack) — audio trimming
- Heroku buildpack: `https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest.git`

**Fallback:** Admin can also paste a direct S3 URL manually in the "رابط مباشر للملف الصوتي" field.

### Via Legacy Admin Panel (Flask-Admin)

1. Admin navigates to mosque edit form in Flask-Admin
2. Fills in `imam_audio` field with a file or URL
3. On form submit, `after_model_change()` processes:
   - If file upload: calls `upload_audio_to_s3(file)` → returns S3 URL
   - If URL string: stores as-is
   - Updates `imam.audio_sample` column

### Via Legacy Admin Audio Upload Endpoint

```
POST /admin/upload-audio
Authorization: Flask-Login session
Content-Type: multipart/form-data
Body: { file: <MP3 file> }

Response: { "url": "https://imams-riyadh-audio.s3.us-east-1.amazonaws.com/audio/{uuid}.mp3" }
```

### Via Legacy Imam Swap Form

```
GET/POST /admin/mosque/swap-imam/<mosque_id>
```
- Form includes audio file upload field for new imam
- Uploaded to S3, URL stored in imam record

---

## Audio Playback Architecture

### Frontend (AudioContext)

```
User clicks play on MosqueCard
  │
  ▼
AudioContext.play({ mosqueId, mosqueName, imamName, audioUrl })
  │
  ▼
Create new Audio(resolvedUrl)
  │
  ▼
Audio.play() → isLoading=true
  │
  ├─→ onloadedmetadata → set duration
  ├─→ oncanplay → isLoading=false
  ├─→ requestAnimationFrame loop → update progress/currentTime
  ├─→ onended → stop(), clear track
  └─→ onerror → set error, clear track
```

### FloatingAudioPlayer

- Fixed at bottom of viewport (z-50)
- Shows: play/pause, mosque name, imam name, progress slider, time, close
- Radix UI Slider for seeking
- Safe area padding for iPhone notch

### MosqueCard Audio Row

- Full-width tappable area
- Play circle with breathing pulse animation (idle)
- Soundbar animation (playing)
- Gold shimmer hover effect (desktop)
- Stops event propagation to prevent card navigation

### MosqueDetailPage Audio Section

- Larger audio area with gradient background
- Same play/pause/soundbar behavior
- YouTube link integrated in audio row

---

## Image Assets

```
static/images/
├── animated-moon.gif       # Header branding animation
├── favicon-16x16.png       # Browser tab icon (small)
├── favicon-32x32.png       # Browser tab icon (standard)
├── location-icon.svg       # Map pin icon (legacy)
├── logo.png                # App logo (192x192, used for PWA)
├── mosque-icon.svg         # Mosque icon (legacy, replaced by react-icons)
└── og-image-v2.png         # Open Graph social preview (1200×630)
```

### OG Image

- **Dimensions:** 1200×630 pixels (1.91:1 ratio)
- **Format:** PNG
- **Background:** `#0d4b33` (brand green)
- **Content:** Arabic text "أئمة التراويح في الرياض", mosque count, URL
- **Used in:** `og:image` meta tag, Twitter Card
- **Served at:** `https://taraweeh.org/static/images/og-image-v2.png`

### PWA Icons

Referenced in `manifest.webmanifest`:
- 32×32 favicon (`/static/images/favicon-32x32.png`)
- 192×192 logo (`/static/images/logo.png`)
- 512×512 maskable logo (`/static/images/logo.png` — same file, dual purpose)

---

## Legacy Static Files (Deprecated)

```
static/css/styles.css    # Old Jinja2 styles — not used by React
static/js/script.js      # Old Jinja2 JavaScript — not used by React
```

These remain in the repository but are only referenced by legacy Jinja2 templates (`base.html`), which are only used for the admin login page and as fallback.

---

## Caching Strategy Summary

| Asset Type | Location | HTTP Cache | PWA Cache | Strategy |
|-----------|----------|------------|-----------|----------|
| Vite bundles | `/assets/*` | 1 year, immutable | Precached | Content-hashed filenames |
| Local audio | `/static/audio/*` | 7 days | CacheFirst, 7d | Rarely changes |
| S3 audio | `s3.amazonaws.com` | S3 defaults | CacheFirst, 7d + range | Rarely changes |
| Images | `/static/images/*` | 30 days | CacheFirst, 30d | Rarely changes |
| Google Fonts | `gstatic.com` | Font defaults | CacheFirst, 1y | Never changes |
| API responses | `/api/*` | No cache header | NetworkFirst, 24h | Fresh when online |
| Service Worker | `/sw.js` | must-revalidate | — | Always fresh |
