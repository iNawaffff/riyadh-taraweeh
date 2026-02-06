# Open Graph Image Design Guide

This guide explains how to create a professional social preview image (OG image) for taraweeh.org.

---

## Specifications

| Property | Value |
|----------|-------|
| **Dimensions** | 1200 × 630 pixels (1.91:1 aspect ratio) |
| **Format** | PNG or JPG (PNG preferred for text clarity) |
| **File size** | Under 300KB for fast loading |
| **File location** | `/static/images/og-image.png` |

### Why 1200×630?
- **LinkedIn**: Displays at 1200×627 (nearly perfect fit)
- **Twitter**: Displays at 1200×628 with `summary_large_image`
- **Facebook**: Displays at 1200×630 (exact match)
- **WhatsApp/Telegram**: Auto-crops to fit, centered works best

---

## Design Concept for Taraweeh.org

### Layout (Right-to-Left)

```
┌────────────────────────────────────────────────────────────────┐
│                                                                │
│  ┌──────────────────────────────────────┐    ┌──────────────┐ │
│  │                                      │    │              │ │
│  │   أئمة التراويح                      │    │    🌙        │ │
│  │   في الرياض                          │    │   [Logo]     │ │
│  │                                      │    │              │ │
│  │   ─────────────────────              │    └──────────────┘ │
│  │                                      │                     │
│  │   ١١٨+ مسجد | استمع للتلاوات        │                     │
│  │   تابع حضورك طوال رمضان              │                     │
│  │                                      │                     │
│  │   taraweeh.org                       │                     │
│  │                                      │                     │
│  └──────────────────────────────────────┘                     │
│                                                                │
│  [Subtle geometric Islamic pattern in background]              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Color Palette

| Element | Color | Hex |
|---------|-------|-----|
| **Background** | Deep forest green (brand primary) | `#0d4b33` |
| **Gradient end** | Slightly darker green | `#0a3d2a` |
| **Primary text** | White | `#FFFFFF` |
| **Secondary text** | Light green/mint | `#a7f3d0` |
| **Accent** | Gold/amber (moon glow) | `#fbbf24` |
| **Pattern overlay** | White at 5% opacity | `rgba(255,255,255,0.05)` |

### Typography

- **Main title**: Tajawal Bold, 72px
- **Subtitle**: Tajawal Medium, 36px
- **Stats/URL**: Tajawal Regular, 28px

### Visual Elements

1. **Moon icon/logo** (top right) — Your existing logo or a crescent moon with glow effect
2. **Geometric pattern** — Subtle Islamic star/arabesque pattern as background texture
3. **Gradient overlay** — Radial gradient from center-right for depth
4. **Stats badges** — "١١٨+ مسجد" as a subtle pill/badge

---

## Tools to Create the Image

### Option 1: Figma (Recommended for designers)
1. Create a frame: 1200×630
2. Use the layout above
3. Export as PNG 2x for retina, then compress

### Option 2: Canva (Easiest)
1. Go to canva.com → Create design → Custom size: 1200×630
2. Search "Islamic pattern" for backgrounds
3. Add text in Arabic (use Tajawal font)
4. Download as PNG

### Option 3: Code-based (Vercel OG)
For dynamic OG images (e.g., per-mosque pages), you can use:
- **@vercel/og** — React components → image
- **Satori** — The underlying library

Example for a simple static image using HTML/CSS:

```html
<!-- Save as og-template.html, screenshot at 1200x630 -->
<div style="
  width: 1200px;
  height: 630px;
  background: linear-gradient(135deg, #0d4b33 0%, #0a3d2a 100%);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 60px 80px;
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
">
  <div style="max-width: 700px;">
    <h1 style="color: white; font-size: 72px; margin: 0; font-weight: 700;">
      أئمة التراويح
    </h1>
    <h2 style="color: white; font-size: 48px; margin: 10px 0 30px; font-weight: 500; opacity: 0.9;">
      في الرياض
    </h2>
    <div style="width: 100px; height: 4px; background: #fbbf24; margin-bottom: 30px;"></div>
    <p style="color: #a7f3d0; font-size: 28px; margin: 0;">
      ١١٨+ مسجد | استمع للتلاوات | تابع حضورك
    </p>
    <p style="color: white; font-size: 24px; margin-top: 40px; opacity: 0.7;">
      taraweeh.org
    </p>
  </div>
  <div style="
    width: 180px;
    height: 180px;
    background: rgba(255,255,255,0.1);
    border-radius: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <!-- Moon/Logo here -->
    <span style="font-size: 80px;">🌙</span>
  </div>
</div>
```

### Option 4: Photoshop/Illustrator
For maximum control and professional polish.

---

## Checklist Before Export

- [ ] Text is readable at small sizes (test at 400px wide)
- [ ] No important content in the outer 50px (safe zone for cropping)
- [ ] File size under 300KB
- [ ] Correct dimensions: exactly 1200×630
- [ ] Brand colors match the website
- [ ] Arabic text renders correctly (RTL, proper shaping)
- [ ] Logo/icon is visible and recognizable
- [ ] URL is included but not dominant

---

## Testing Your OG Image

### 1. Facebook Sharing Debugger
https://developers.facebook.com/tools/debug/
- Enter your URL
- Click "Scrape Again" to refresh cache

### 2. Twitter Card Validator
https://cards-dev.twitter.com/validator
- Enter URL to preview

### 3. LinkedIn Post Inspector
https://www.linkedin.com/post-inspector/
- Check how it appears on LinkedIn

### 4. OpenGraph.xyz
https://www.opengraph.xyz/
- Universal preview across platforms

---

## Current Status

Your current OG image (`/static/images/og-image.png`):
- Dimensions: **1197×757** (should be 1200×630)
- Not referenced in HTML: **Now fixed** ✓

### Action Required

1. Create a new image at **1200×630** following this guide
2. Replace `/static/images/og-image.png`
3. Test using the tools above
4. Clear social platform caches (they cache aggressively)

---

## Per-Page OG Images (Advanced)

For individual mosque pages, you could generate dynamic OG images with:
- Mosque name
- Imam name
- Location/area

This requires a server-side solution (Vercel OG, Cloudinary, or custom endpoint).
For MVP, a single site-wide OG image is sufficient.
