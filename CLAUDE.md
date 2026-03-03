# CLAUDE.md — Ortho Post Creator

React/Vite browser-only wizard for Dr. Mhanna Aljabab to create Instagram dental before/after posts. No backend, no data storage — all processing is local.

## Commands

```bash
npm run dev       # Dev server → http://localhost:5173
npm run build     # Production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

Working directory: `ortho-post-creator/`

## GitHub

- **Repo**: https://github.com/Maljabab-sys/nasj
- **Default branch**: `main`

### /push — Push to main

When the user says `/push`, follow these steps:

1. Run `npm run build` to verify the project builds successfully
2. Stage all changes: `git add -A`
3. Create a commit with a concise message describing the changes (include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`)
4. Push to origin main: `git push origin main`
5. Report the result to the user

## Stack

- React 19 + Vite 7
- Tailwind CSS 3
- react-image-crop (cropping)
- Canvas API (annotation drawing + final compositing)

## Project Structure

```
src/
  pages/                  ← One file per wizard step (top-level view, no logic)
    UploadPage.jsx
    CropPage.jsx
    AnnotatePage.jsx
    ComposePage.jsx
  features/               ← Self-contained modules (own components + hooks + utils)
    annotation/
      AnnotationCanvas.jsx
      AnnotationToolbar.jsx
      useAnnotation.js      # Core drawing state + mouse/touch handlers
      drawAnnotations.js    # Catmull-Rom smooth curves, watermark
      autoArchGenerator.js  # Incisal edge + full arch presets
    crop/
      CropEditor.jsx
      cropImage.js
    compose/
      useCompositor.js      # Final canvas compositing (all 3 layouts)
      downloadCanvas.js
  components/             ← Shared UI reused across 2+ pages/features
    Header.jsx
    StepIndicator.jsx
    ImageDropZone.jsx
  constants/
    annotation.js         # ANNOTATION_COLOR, DASH_PATTERN, LINE_WIDTH
    layout.js             # OUTPUT_SIZES, DEFAULT_DOCTOR_NAME
  i18n/
    en.js                 # English strings
    ar.js                 # Arabic strings (RTL)
    LanguageContext.jsx   # Language toggle context
  App.jsx
  main.jsx
```

### Folder rules — MANDATORY
- **`pages/`** — one file per wizard step or top-level view; pages only wire together features, no business logic lives here
- **`features/`** — a feature owns everything it needs (components, hooks, utils); new feature = new subfolder
- **`components/`** — only put things here if genuinely reused across 2+ pages or features; do NOT put feature-specific components here
- New page → new file in `pages/` + register in `App.jsx` + update StepIndicator count if it's a wizard step
- New feature → new subfolder in `features/`

## 4-Step Wizard Flow

1. **Upload** — Category (Medical/Ecommerce) → Post type (Before/After or Single) → Layout → Drag-drop photos into template slots
2. **Crop** — react-image-crop per image, skippable
3. **Annotate** — Freehand / point-to-point / auto-arch dashed lines on Canvas
4. **Compose** — Stacked / side-by-side / single layout + watermark + download PNG

## Design Constants — NEVER CHANGE without asking

| Constant | Value | Purpose |
|---|---|---|
| `ANNOTATION_COLOR` | `#1a3a6b` | Dark navy blue — all annotation lines |
| `DEFAULT_DOCTOR_NAME` | `DR.MHANNA ALJABAB` | Default watermark text |
| `DASH_PATTERN` | `[10, 6]` | Canvas setLineDash |
| `LINE_WIDTH` | `3` | Annotation stroke width |

### Theme Fonts — MANDATORY
- **English**: `Nunito` (weights: 400, 500, 600, 700, 800) — loaded from Google Fonts
- **Arabic**: `Noto Sans Arabic` (weights: 400, 500, 600, 700, 800) — loaded from Google Fonts
- Font switching is automatic: `LanguageContext` adds `font-arabic` class to `<html>` when `lang === 'ar'`
- CSS rules in `index.css` apply `Noto Sans Arabic` to `body`, `button`, `input`, `textarea` when `.font-arabic` is present
- **Default language is Arabic** (`ar`) — the landing page loads in Arabic/RTL by default
- Do NOT introduce new font families without explicit approval
- All font loading happens in `index.html` via Google Fonts `<link>` tags

### Theme Colors (Tailwind)
- Primary: `blue-900` / `#1a3a6b` (navy) — same in both modes
- Accent: `blue-600` for interactive states — same in both modes
- Annotation lines: always `#1a3a6b` (Canvas-drawn, not CSS)

## Rules — Apply to Every Change

### Arabic (RTL) Support — MANDATORY
- Every new UI string must be added to **both** `src/i18n/en.js` and `src/i18n/ar.js`
- Arabic file is RTL — wrap new layout sections with `dir="rtl"` if standalone, or rely on `LanguageContext` already applied at root
- Arabic string key naming mirrors English exactly
- Function-valued strings (e.g. `(label) => \`...\``) must be replicated as Arabic equivalents
- Always test that new UI looks correct in both languages by checking the language toggle

### Styling — Tailwind First — MANDATORY
- **Always use Tailwind utility classes** for layout, spacing, color, typography, borders, shadows, and responsive behavior
- **Do NOT write custom CSS** for anything Tailwind can handle — no new rules in `index.css` or new `.css` files
- **Inline `style={{}}` is allowed only** for values that Tailwind genuinely cannot express:
  - Dynamic JS values (e.g. `cursor`, `touchAction: 'none'`, computed pixel sizes)
  - `aspectRatio` with exact non-standard ratios
  - `writingMode` (vertical text)
  - Canvas-specific imperative drawing (not JSX)
- For one-off colors that aren't in the palette, use Tailwind arbitrary values: `bg-[#1a3a6b]`, `text-[#1a3a6b]`
- Keyframe animations go in `index.css` only if Tailwind's `animate-*` utilities don't cover the need
- `index.css` is reserved for: Tailwind directives, RTL/LTR visibility helpers, font overrides for Arabic, third-party library overrides (e.g. `ReactCrop`)

### Dark / Light Mode — MANDATORY
Tailwind is configured with `darkMode: 'class'`. The `dark` class is toggled on `<html>` by the theme toggle in the Header. Every new component or page **must support both modes**.

**Palette:**

| Element | Light mode | Dark mode |
|---|---|---|
| Page background | `bg-stone-50` | `dark:bg-[#0f0f0f]` |
| Surface / card | `bg-white` | `dark:bg-[#1a1a1a]` |
| Border | `border-stone-200` | `dark:border-[#2a2a2a]` |
| Primary text | `text-gray-900` | `dark:text-white` |
| Secondary text | `text-gray-500` | `dark:text-gray-400` |
| Muted text | `text-gray-400` | `dark:text-gray-600` |
| Input background | `bg-white border-stone-300` | `dark:bg-[#1a1a1a] dark:border-[#3a3a3a]` |
| Primary button | `bg-blue-700 text-white hover:bg-blue-600` | `dark:bg-blue-600 dark:hover:bg-blue-500` |
| Disabled button | `bg-stone-200 text-stone-400` | `dark:bg-[#2a2a2a] dark:text-gray-500` |

**Rules:**
- Light mode is the **default** (no prefix); dark mode uses the `dark:` prefix
- Warm off-white (`stone-50` / `stone-100`) for light backgrounds — not plain white
- Never hardcode dark hex colors (`#1a1a1a`, `#0f0f0f`) without a paired `light` default class
- The theme toggle button lives in `Header.jsx` — it adds/removes `dark` on `document.documentElement`
- Canvas-drawn content (annotations, composited image) is unaffected by CSS theme

### Theme Consistency — MANDATORY
- Primary accent: `#1a3a6b` / `blue-900` — same in both modes
- Primary button: `bg-blue-700 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500`
- Do NOT introduce new accent colors without explicit approval
- Annotation/Canvas color stays `#1a3a6b` regardless of theme

### Mobile Responsive — MANDATORY
Every new page and component **must be fully usable on mobile (≥320px wide)**. Apply these rules on every change:

- **No fixed pixel widths** on layout containers — use `w-full`, `max-w-*`, or responsive breakpoints (`sm:`, `md:`, `lg:`) instead of `style={{ width: 480 }}`
- **Card grids**: use `grid-cols-1 sm:grid-cols-2` — never a fixed-column grid that overflows on mobile
- **Side-by-side layouts**: use `flex-col` on mobile, `md:flex-row` or `lg:flex-row` on wider screens
- **Touch targets**: buttons must be at least 44×44px on mobile (use `min-h-[44px]` or adequate padding)
- **Text sizes**: headings scale down on mobile — prefer `text-2xl sm:text-4xl` over fixed large sizes
- **Images / icons**: never use fixed large sizes without `max-w-full` or responsive capping
- **Horizontal overflow**: never let content overflow the viewport — check with `overflow-x-hidden` on the page root if needed
- **Test breakpoints**: always mentally verify at 375px (iPhone SE), 390px (iPhone 14), and 768px (tablet)

### New Pages / Components Checklist
When adding any new step, page, or significant component:
1. Add all user-visible strings to `en.js` AND `ar.js`
2. Apply both light and dark mode classes (see palette above)
3. Apply theme accent colors (`#1a3a6b` / `blue-900` family)
4. Follow existing component structure (functional component, named export)
5. Place in the correct folder: `pages/`, `features/<name>/`, or `components/`
6. Register in `App.jsx` if it's a wizard step + update StepIndicator count
7. **Apply mobile-responsive layout** (see Mobile Responsive rules above)

## Key Architecture Notes

- **Normalized coords**: All annotation strokes are stored as 0–1 normalized coordinates so they scale from preview canvas to 1080px output canvas without recalculation
- **DPR scaling**: Canvas elements are scaled by `window.devicePixelRatio` for crisp Retina rendering
- **No state persistence**: Refreshing the page clears all data — by design (privacy)
- **Compositing**: `useCompositor.js` draws the final image entirely on a hidden off-screen Canvas, then triggers a PNG download via a Blob URL

## i18n Pattern

```jsx
// In components — always use the useLanguage() hook, never hardcode strings
import { useLanguage } from '../../i18n/LanguageContext'
const { t } = useLanguage()
// ...
<h2>{t.composeHeading}</h2>
// For function strings:
<h2>{t.annotateHeading(label)}</h2>
```

Adding a new string:
1. Add key to `en.js`
2. Add same key with Arabic translation to `ar.js`
3. Use `t('yourKey')` in the component
