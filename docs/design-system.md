# Mine Trade Guru — Design System

Material Design 3 (<https://m3.material.io/foundations>) implemented through
Vuetify 4 (md3 blueprint), plus the Vietnamese market color set. This file is the single source
of truth for colors, CSS variables and styling rules. `docs/plan.md` §8 points
here.

---

## 1. Where tokens live

| Kind | File | Consumed as |
|---|---|---|
| Color palettes (M3 roles + market colors), light and dark | `src/constants/themeColors.ts` | Vuetify theme → `--v-theme-<name>` CSS variables, color props, `text-*` / `bg-*` classes |
| Non-color tokens (spacing, shape, type, motion, state, board metrics) | `src/styles/tokens.css` | `--mtg-*` CSS variables |
| Global base styles (numbers, focus ring, scrollbars) | `src/styles/base.css` | class `.mtg-num`, global selectors |
| Motion (flash keyframes, reduced motion) | `src/styles/motion.css` | classes `.mtg-flash-up` / `.mtg-flash-down` |
| Vuetify setup (blueprint, themes, component defaults) | `src/plugins/vuetify.ts` | imports `themeColors.ts` |

`themeColors.ts` is the **only file in the repo allowed to contain a hex color**
(rule C1).

---

## 2. Color set

Vuetify is created with the `md3` blueprint. **Dark is the default theme**
(price boards are read for hours, and iBoard defaults to dark); light is
available through the theme toggle.

### 2.1 M3 color roles

Seed color: blue `#0B57D0`. Tonal values follow the M3 scheme for that seed.

| Role | Light | Dark |
|---|---|---|
| `primary` | `#0B57D0` | `#A8C7FA` |
| `on-primary` | `#FFFFFF` | `#062E6F` |
| `primary-container` | `#D3E3FD` | `#0842A0` |
| `on-primary-container` | `#041E49` | `#D3E3FD` |
| `secondary` | `#545F71` | `#BCC7DB` |
| `on-secondary` | `#FFFFFF` | `#263141` |
| `secondary-container` | `#D8E3F8` | `#3C4758` |
| `on-secondary-container` | `#111C2B` | `#D8E3F8` |
| `tertiary` | `#6D5677` | `#D9BDE3` |
| `on-tertiary` | `#FFFFFF` | `#3D2847` |
| `tertiary-container` | `#F6D9FF` | `#553F5E` |
| `on-tertiary-container` | `#27132F` | `#F6D9FF` |
| `error` | `#BA1A1A` | `#FFB4AB` |
| `on-error` | `#FFFFFF` | `#690005` |
| `error-container` | `#FFDAD6` | `#93000A` |
| `on-error-container` | `#410002` | `#FFDAD6` |
| `background` | `#F9F9FF` | `#111318` |
| `on-background` | `#191C20` | `#E2E2E9` |
| `surface` | `#F9F9FF` | `#111318` |
| `on-surface` | `#191C20` | `#E2E2E9` |
| `surface-variant` | `#E0E2EC` | `#43474E` |
| `on-surface-variant` | `#43474E` | `#C4C6D0` |
| `surface-container-lowest` | `#FFFFFF` | `#0C0E13` |
| `surface-container-low` | `#F3F3FA` | `#191C20` |
| `surface-container` | `#EDEDF4` | `#1D2024` |
| `surface-container-high` | `#E7E8EE` | `#282A2F` |
| `surface-container-highest` | `#E2E2E9` | `#33353A` |
| `outline` | `#74777F` | `#8E9099` |
| `outline-variant` | `#C4C6D0` | `#43474E` |
| `inverse-surface` | `#2E3036` | `#E2E2E9` |
| `inverse-on-surface` | `#F0F0F7` | `#2E3036` |
| `inverse-primary` | `#A8C7FA` | `#0B57D0` |
| `scrim` | `#000000` | `#000000` |

### 2.2 Market colors (VN price convention)

Registered as extra Vuetify theme colors, so each gets `--v-theme-market-*`,
`text-market-*` and `bg-market-*` automatically. Values differ per scheme: the
light values are darker so they keep **≥ 4.5:1 contrast on `surface`** (WCAG AA
for text); the dark values are brighter for the same reason. A unit test checks
every pair (rule C7).

| Token | Meaning | Light | Dark | Marker |
|---|---|---|---|---|
| `market-ceiling` | trần | `#A1119E` | `#F23AF5` | ▲ |
| `market-floor` | sàn | `#006A8A` | `#22D3EE` | ▼ |
| `market-reference` | tham chiếu | `#7A5D00` | `#F5C518` | ■ |
| `market-up` | tăng | `#08703A` | `#1FD17B` | ▲ |
| `market-down` | giảm | `#C62828` | `#FF5C5C` | ▼ |

Yellow can't be bright yellow on a light background and still be readable, which
is why the light reference color is amber. That's intentional.

Prices are shown on the board (`surface`), on panels (`surface-container`) and in
the drawer (`surface-container-high`), so every market token must pass 4.5:1 on
all surfaces from `surface` up to `surface-container-high`, not just on `surface`.
The first draft of floor/reference/up in light mode failed on the panel surfaces
(≈ 4.4:1) and was darkened.

Vuetify also requires `success`, `warning` and `info` (+ `on-*`) in every theme:

| Token | Light | Dark |
|---|---|---|
| `success` / `on-success` | `#146C2E` / `#FFFFFF` | `#7DDC8F` / `#00390F` |
| `warning` / `on-warning` | `#7A5900` / `#FFFFFF` | `#F5BF48` / `#402D00` |
| `info` / `on-info` | `#00639B` / `#FFFFFF` | `#94CCFF` / `#003355` |

### 2.3 Derived colors (no new hex)

Everything else is derived from the tokens above with CSS, never a new hex:

| Use | Derivation |
|---|---|
| Flash background (up / down) | `color-mix(in srgb, rgb(var(--v-theme-market-up)) calc(var(--mtg-flash-opacity) * 100%), transparent)`, held for the first 35 % of `--mtg-flash-duration` (900 ms) then faded; covers the whole cell |
| Row hover | `color-mix(in srgb, rgb(var(--v-theme-on-surface)) calc(var(--mtg-state-hover) * 100%), transparent)` |
| Selected row | `color-mix(in srgb, rgb(var(--v-theme-primary)) calc(var(--mtg-state-selected) * 100%), transparent)` |
| Pinned row | `rgb(var(--v-theme-surface-container-low))` |
| Order-book depth bars | `bg-market-up` at `opacity: var(--mtg-state-dragged)` for bids, `market-down` for asks |
| Heatmap scale (7 steps) | `color-mix(in oklch, rgb(var(--v-theme-market-down)) N%, rgb(var(--v-theme-surface-variant)))` … through `market-up`; steps defined once in `tokens.css` as `--mtg-heat-n3` … `--mtg-heat-p3` |

Vuetify exposes every theme color as a comma-separated `R,G,B` triplet in
`--v-theme-<name>`. So `rgb(var(--v-theme-x))` works, but `rgb(var(--v-theme-x) / a)`
does **not**: it mixes comma and slash syntax, the browser drops it, and nothing is
painted. Transparency goes through `color-mix(… transparent)` instead (rule C3).

### 2.4 Semantic mapping (which role for what)

| UI element | Color |
|---|---|
| App background, board background | `surface` |
| Board header row | `surface-container-high`, text `on-surface-variant` |
| Column group separators, cell borders | `outline-variant` |
| Panels / cards | `surface-container` (M3 uses tonal surfaces, not shadows, for layering) |
| Drawer, menus | `surface-container-high` |
| Symbol code, primary text | `on-surface` |
| Secondary text (labels, timestamps) | `on-surface-variant` |
| Active tab, focus ring, links, selected state | `primary` |
| Filled action buttons | `primary` / `on-primary` |
| Chips, tonal buttons | `secondary-container` / `on-secondary-container` |
| Alert badges, ATO/ATC session | `tertiary` / `tertiary-container` |
| Errors, disconnected state | `error` / `error-container` |
| Session: continuous | `primary` |
| Session: ATO / ATC | `tertiary` |
| Session: lunch / closed / pre-open | `outline` |
| Session: put-through | `secondary` |
| Connection: connected / reconnecting / offline | `market-up` / `market-reference` / `error` |
| Any price, change, change % | market token from `priceColor.ts` |
| Volume numbers | `on-surface` (never colored) |

---

## 3. CSS variables (`src/styles/tokens.css`)

All custom properties use the `--mtg-` prefix, so they can't clash with Vuetify's
`--v-*`. Density variants switch on `[data-density]` set on the board root by
`useSettingsStore`.

```css
:root {
  /* Spacing, 4 px grid (M3) */
  --mtg-space-0: 0;
  --mtg-space-1: 4px;
  --mtg-space-2: 8px;
  --mtg-space-3: 12px;
  --mtg-space-4: 16px;
  --mtg-space-5: 24px;
  --mtg-space-6: 32px;

  /* Shape scale (M3) */
  --mtg-shape-none: 0;
  --mtg-shape-xs: 4px;
  --mtg-shape-sm: 8px;
  --mtg-shape-md: 12px;
  --mtg-shape-lg: 16px;
  --mtg-shape-xl: 28px;
  --mtg-shape-full: 9999px;

  /* Type (M3 scale, used where Vuetify classes don't fit, e.g. the board) */
  --mtg-font-family: 'Roboto', system-ui, sans-serif;
  --mtg-font-label-sm: 11px;
  --mtg-font-label-md: 12px;
  --mtg-font-body-sm: 12px;
  --mtg-font-body-md: 14px;
  --mtg-font-title-sm: 14px;
  --mtg-font-title-md: 16px;
  --mtg-font-headline-sm: 24px;
  --mtg-weight-regular: 400;
  --mtg-weight-medium: 500;
  --mtg-weight-bold: 700;

  /* State layers (M3) */
  --mtg-state-hover: 0.08;
  --mtg-state-focus: 0.10;
  --mtg-state-pressed: 0.10;
  --mtg-state-dragged: 0.16;
  --mtg-state-selected: 0.12;

  /* Motion (M3) */
  --mtg-duration-short2: 100ms;
  --mtg-duration-short4: 200ms;
  --mtg-duration-medium2: 300ms;
  --mtg-duration-long2: 500ms;
  --mtg-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --mtg-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --mtg-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);

  /* Price flash */
  --mtg-flash-duration: 900ms;
  --mtg-flash-opacity: 0.45;

  /* Focus */
  --mtg-focus-ring-width: 2px;
  --mtg-focus-ring-offset: 2px;

  /* Board metrics (comfortable = default) */
  --mtg-board-row-height: 32px;
  --mtg-board-header-height: 36px;
  --mtg-board-font-size: var(--mtg-font-body-md);
  --mtg-board-cell-padding-x: var(--mtg-space-2);
  --mtg-board-col-symbol: 72px;
  --mtg-board-col-price: 64px;
  --mtg-board-col-volume: 80px;

  /* Layout */
  --mtg-header-height: 56px;
  --mtg-ticker-height: 64px;
  --mtg-drawer-width: 480px;

  /* Heatmap scale (derived, §2.3) */
  --mtg-heat-n3: rgb(var(--v-theme-market-down));
  --mtg-heat-n2: color-mix(in oklch, rgb(var(--v-theme-market-down)) 66%, rgb(var(--v-theme-surface-variant)));
  --mtg-heat-n1: color-mix(in oklch, rgb(var(--v-theme-market-down)) 33%, rgb(var(--v-theme-surface-variant)));
  --mtg-heat-0:  rgb(var(--v-theme-surface-variant));
  --mtg-heat-p1: color-mix(in oklch, rgb(var(--v-theme-market-up)) 33%, rgb(var(--v-theme-surface-variant)));
  --mtg-heat-p2: color-mix(in oklch, rgb(var(--v-theme-market-up)) 66%, rgb(var(--v-theme-surface-variant)));
  --mtg-heat-p3: rgb(var(--v-theme-market-up));
}

[data-density='compact'] {
  --mtg-board-row-height: 24px;
  --mtg-board-header-height: 28px;
  --mtg-board-font-size: var(--mtg-font-body-sm);
  --mtg-board-cell-padding-x: var(--mtg-space-1);
}

[data-font-scale='large'] {
  --mtg-board-font-size: var(--mtg-font-title-md);
  --mtg-board-row-height: 36px;
}
```

`src/styles/base.css`:

```css
.mtg-num {
  font-variant-numeric: tabular-nums;   /* digits line up in every column */
  font-feature-settings: 'tnum' 1;
  text-align: right;
  white-space: nowrap;
}

:focus-visible {
  outline: var(--mtg-focus-ring-width) solid rgb(var(--v-theme-primary));
  outline-offset: var(--mtg-focus-ring-offset);
}
```

`src/styles/motion.css`:

```css
/* Whole cell holds the color for the first third, then fades (iBoard-style blink).
   Each direction also has an identical "-alt" keyframe to restart on repeat ticks. */
@keyframes mtg-flash-up {
  0%, 35% { background-color: color-mix(in srgb, rgb(var(--v-theme-market-up)) calc(var(--mtg-flash-opacity) * 100%), transparent); }
  100%    { background-color: transparent; }
}
/* mtg-flash-down: same with --v-theme-market-down */

@media (prefers-reduced-motion: no-preference) {
  .mtg-flash-up   { animation: mtg-flash-up var(--mtg-flash-duration) var(--mtg-flash-easing); }
  .mtg-flash-down { animation: mtg-flash-down var(--mtg-flash-duration) var(--mtg-flash-easing); }
}

@media (prefers-reduced-motion: reduce) {
  .mtg-flash-up   { background-color: color-mix(in srgb, rgb(var(--v-theme-market-up)) calc(var(--mtg-flash-static-opacity) * 100%), transparent); }
  .mtg-flash-down { background-color: color-mix(in srgb, rgb(var(--v-theme-market-down)) calc(var(--mtg-flash-static-opacity) * 100%), transparent); }
}
```

---

## 4. Typography

- Vuetify `md3` blueprint provides the M3 type scale classes; use them for all
  non-board text (headers, panels, drawer, dialogs).
- The board uses `--mtg-board-font-size` so density and font-scale settings work
  in one place.
- **Every number** (price, volume, percent, index, time) gets `.mtg-num`
  (tabular figures, right-aligned). Symbol codes are `--mtg-weight-bold`.
- Font: Roboto (the M3 default), self-hosted via `@fontsource/roboto` 400/500/700
  to avoid a render-blocking external request (NFR-P3).

---

## 5. Elevation and surfaces

M3 layers with tonal surface colors first, shadows second. Vuetify `elevation`
props map to M3 levels:

| M3 level | Vuetify `elevation` | Used for |
|---|---|---|
| 0 | 0 | Board, ticker bar, panels (tone only: `surface-container`) |
| 1 | 1 | Cards that sit on `surface` |
| 2 | 3 | Menus, search dropdown |
| 3 | 6 | Navigation drawer, symbol drawer |
| 4 | 8 | Snackbars / alert toasts |
| 5 | 12 | Dialogs |

---

## 6. Vuetify setup (`src/plugins/vuetify.ts`)

```ts
import { createVuetify } from 'vuetify'
import { md3 } from 'vuetify/blueprints'
import { DARK_SCHEME, LIGHT_SCHEME } from '@/constants/themeColors'

export default createVuetify({
  blueprint: md3,
  theme: {
    defaultTheme: 'mtgDark',
    themes: {
      mtgDark:  { dark: true,  colors: DARK_SCHEME },
      mtgLight: { dark: false, colors: LIGHT_SCHEME },
    },
    variations: false,           // shades come from M3 tones, not Vuetify's lighten/darken
  },
  defaults: {
    global: { density: 'comfortable' },
    VBtn: { rounded: 'xl' },      // M3 full-rounded buttons
    VCard: { rounded: 'lg', elevation: 0, color: 'surface-container' },
    VChip: { rounded: 'sm' },
    VTextField: { variant: 'outlined', density: 'compact' },
    VNavigationDrawer: { color: 'surface-container-high' },
  },
})
```

`constants/themeColors.ts` exports `LIGHT_SCHEME` and `DARK_SCHEME` as
`Record<ThemeColorName, string>`, where `ThemeColorName` (in `interfaces/theme.ts`)
is the union of every role in §2.1 and every market token in §2.2. A missing or
misspelled color is a compile error.

---

## 7. Rules

### Colors
- **C1** Hex values exist only in `constants/themeColors.ts`. Nowhere else: not
  in `.vue`, `.css`, other `.ts` files, or chart options.
- **C2** Components use colors through Vuetify props (`color="primary"`), classes
  (`text-market-up`, `bg-surface-container`), or `rgb(var(--v-theme-x))` in scoped
  CSS. No `rgb()`/`hsl()` literals with numbers.
- **C3** Transparency is always
  `color-mix(in srgb, rgb(var(--v-theme-x)) calc(<alpha> * 100%), transparent)`, with the
  alpha coming from a `--mtg-state-*` / `--mtg-flash-*` token wherever one exists. Never
  `rgb(var(--v-theme-x) / <alpha>)`: it is invalid with Vuetify's comma triplets and
  silently renders nothing (Stylelint blocks it).
- **C4** A price-related color always comes from `utils/priceColor.ts`. No
  component compares a price to the reference itself.
- **C5** Color is never the only signal: every market color is paired with a
  marker from `utils/priceMarker.ts` and an aria label.
- **C6** Need a new color? Derive it (§2.3). If it truly can't be derived, add it
  to `themeColors.ts` for **both** schemes and to `ThemeColorName`.
- **C7** A unit test checks every text-on-surface pair against WCAG AA 4.5:1 in
  both schemes and fails the build otherwise: each `on-*` role on its role, and each
  market token on `surface`, `surface-container-low`, `surface-container` and
  `surface-container-high`.
- **C8** Chart libraries get colors at runtime from the active Vuetify theme
  (`useTheme().current.value.colors`) through `useLightweightChart`, and re-apply
  on theme change. No colors hard-coded in chart options.

### CSS variables and styles
- **S1** Non-color values (spacing, radius, font size, duration, row height) come
  from `--mtg-*` tokens or Vuetify props/classes. The only raw lengths allowed in
  components are `0` and `1px` borders.
- **S2** New tokens go in `styles/tokens.css` with the `--mtg-` prefix; never
  declare custom properties inside a component.
- **S3** Styles are `<style scoped>` plain CSS. No SCSS (one token system, no
  `$variables` duplicating CSS variables), no inline `style` attributes except
  bound CSS variables (e.g. `:style="{ '--depth': ratio }"` for depth bar width).
- **S4** Class names are kebab-case; global utility classes are prefixed `mtg-`.
  No `!important`.
- **S5** Animate only `opacity`, `transform` and `background-color`, and every
  animation has a `prefers-reduced-motion` fallback.
- **S6** Numbers use `.mtg-num`; no component sets `font-variant-numeric` itself.
- **S7** No z-index literals; use Vuetify's layering (overlays, drawers, menus).

### Enforcement
- **Stylelint** (`stylelint-config-standard` + `stylelint-config-recommended-vue`):
  `color-no-hex`, `color-named: never`, `function-disallowed-list: ['hsl',
  'hsla']`, `declaration-property-value-disallowed-list` with
  `/rgba?\(\s*\d/` (blocks numeric `rgb()` literals) and
  `/rgba?\(var\(--v-theme-…\)\s*\//` (blocks the invalid slash-alpha form) on every
  property, `declaration-no-important`,
  `custom-property-pattern: ^(mtg|v|depth)-`, `selector-class-pattern`
  kebab-case, `declaration-property-unit-allowed-list` (px only for
  `border-width`). `src/styles/tokens.css` is excluded from the unit rule, since
  it is where the px values are defined.
- **ESLint** `no-restricted-syntax`: string literals matching `/#[0-9a-f]{3,8}\b/i`
  are errors in every file except `src/constants/themeColors.ts`.
- **Test**: contrast test (C7), plus a test that `LIGHT_SCHEME` and `DARK_SCHEME`
  have identical keys.
- **Review**: C4, C5, S1 are checked in PR review against this file.
