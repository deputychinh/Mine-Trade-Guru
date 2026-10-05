# Mine Trade Guru — Project Plan

> A real-time Vietnamese stock price-board dashboard, modelled on SSI iBoard.
> Frontend: **Vue 3.5 + Vuetify 4** (Material Design 3 blueprint), TypeScript, Vite, Pinia.
> Backend: **Node.js + Express + ws**, a mock market-data server that speaks SSI's channel format (real feed needs credentials, see §7).
> UI reference: <https://iboard.ssi.com.vn/> · Design system: <https://m3.material.io/foundations>
> Code standard: **Vue Patterns** (Composition API, `<script setup>`, Setup Stores, container/presentational split), see §9.

---

## 1. Goals

1. Rebuild the iBoard experience: a dense, live price board for every instrument
   type on HOSE/HNX/UPCOM, with the Vietnamese 5-color price convention, 3-level
   order book, foreign flow, session status and per-symbol detail.
2. Make it fast under real market load. The whole design is driven by measurable
   non-functional targets (§3), not by "it feels fine on 30 rows".
3. Keep the code solid: one job per component, constants in `constants/`, types in
   `interfaces/`, colors only as design tokens, M3 throughout. Every rule in §9 is
   checkable in review or lint.

The chain used in this document is **functional requirement (FR) → non-functional
requirement (NFR) → design decision**. The matrix in §4 is how a reviewer checks
that every optimization exists because a target needs it, not because it looks
senior.

---

## 2. Functional requirements (FR)

### 2.1 Price board
| ID | Requirement |
|---|---|
| FR-01 | Show a live board with, per symbol: code, ceiling, floor, reference; 3 best bids (price + volume); matched price, matched volume, change, change %; 3 best asks; total volume; high, low, average; foreign buy, foreign sell, foreign room. Same column grouping as iBoard. |
| FR-02 | Color every price with the VN 5-color rule (ceiling, floor, reference, up, down), and add a non-color cue (▲ ▼ ■) for accessibility. |
| FR-03 | Board tabs: **VN30**, **HOSE**, **HNX**, **HNX30**, **UPCOM**, **Watchlists**, **Derivatives** (VN30F futures), **Covered warrants**, **ETF**, **Sectors**. |
| FR-04 | Flash a cell when its value changes (green on up-tick, red on down-tick), with a setting to turn flashing off. |
| FR-05 | Sort by any column; show/hide column groups (order book, foreign, OHLC); reorder columns by drag; layout is persisted. |
| FR-06 | Display unit settings: price in ×1,000 VND or full VND; volume in ×10 shares (iBoard default) or shares. |
| FR-07 | Density setting (compact / comfortable) and font-size setting for the board. |
| FR-08 | Pin symbols to the top of any board. |

### 2.2 Market overview
| ID | Requirement |
|---|---|
| FR-10 | Index ticker bar: VNINDEX, VN30, HNX-INDEX, HNX30, UPCOM-INDEX with value, change, change %, volume, value, advancers/decliners/unchanged, and a sparkline. |
| FR-11 | Market breadth panel: advance / decline / unchanged / ceiling / floor counts per exchange. |
| FR-12 | Top movers: top 10 gainers, losers, by volume, by value; clicking one opens its detail. |
| FR-13 | Foreign flow panel: top 10 net foreign buy and net foreign sell. |
| FR-14 | Sector heatmap: treemap of symbols sized by market cap, colored by change %, grouped by sector. |
| FR-15 | Market session indicator: pre-open, ATO, continuous, lunch break, ATC, put-through, closed, with a countdown to the next phase (HOSE/HNX schedules). |

### 2.3 Symbol detail
| ID | Requirement |
|---|---|
| FR-20 | Clicking a row, or pressing Enter on a focused row, opens a detail drawer. |
| FR-21 | Intraday candlestick chart with volume histogram; timeframes 1m / 5m / 15m / 1h; line/candle toggle; reference/ceiling/floor price lines. |
| FR-22 | Full order-book depth (3 levels) shown as horizontal bars. |
| FR-23 | Time & sales tape: every matched trade (time, price, volume, side), newest first, live. |
| FR-24 | Volume by price: total matched volume at each price step for the session. |
| FR-25 | Key stats: open, high, low, average, total volume and value, foreign buy/sell/room, market cap, sector. |

### 2.4 Watchlists and alerts
| ID | Requirement |
|---|---|
| FR-30 | Multiple named watchlists: create, rename, delete, add/remove symbols, drag to reorder. Persisted locally. |
| FR-31 | Import/export a watchlist as CSV. |
| FR-32 | Price alerts per symbol: price above/below X, change % above/below Y, hits ceiling/floor, volume spike. |
| FR-33 | Alert center: list of triggered alerts with time, mark as read, clear. Delivered as an in-app toast, optionally a browser notification and a sound. |

### 2.5 Search, navigation, settings
| ID | Requirement |
|---|---|
| FR-40 | Global search with autocomplete by symbol or company name; the result opens detail or jumps to the row. |
| FR-41 | Keyboard shortcuts: `/` focus search, `↑`/`↓` move row, `Enter` open detail, `W` toggle watchlist, `Esc` close drawer, `?` shortcut help. |
| FR-42 | Light / dark theme (both real M3 schemes), persisted. |
| FR-43 | Language VI / EN. |
| FR-44 | Fullscreen board mode. |
| FR-45 | Connection indicator (connected / reconnecting / offline), time since last tick, and pause/resume live updates. |
| FR-46 | Responsive: full board on desktop, reduced columns on tablet, card list on phone (≥ 360 px). |

### 2.6 Out of scope
Real SSI FastConnect integration (§7, needs credentials), order placement,
accounts and server-side persistence, multi-day history beyond the session,
news feed, native mobile app.

---

## 3. Non-functional requirements (NFR)

Targets are measured on a mid-range laptop (4× CPU throttle in Chrome DevTools)
unless stated. The backend has a **stress mode** (§6.3) so every number below
can be reproduced.

### 3.1 Performance
| ID | Target | How it's measured |
|---|---|---|
| NFR-P1 | **Tick-to-paint p95 < 100 ms** (a price change reaches the screen within 100 ms of the frame arriving). | Timestamp in message vs. `requestAnimationFrame` paint time, logged by the dev perf overlay. |
| NFR-P2 | **Sustain 1,500 symbols × 5 updates/s** with no long task > 50 ms and ≥ 55 fps while scrolling. | DevTools Performance trace in stress mode. |
| NFR-P3 | **Initial load: LCP < 2.0 s, TTI < 3.0 s** on Fast 4G. | Lighthouse. |
| NFR-P4 | **Initial JS < 250 KB gzip.** Charts, heatmap and drawer load on demand. | `vite build` report + bundle visualizer. |
| NFR-P5 | **Memory stable:** heap growth < 20 MB/hour over a 4-hour session. | Heap snapshots at 0 / 1 / 4 h. |
| NFR-P6 | Search autocomplete responds in < 50 ms over 1,500 symbols. | Vitest benchmark. |
| NFR-P7 | Opening the detail drawer shows content in < 300 ms (chart chunk cached after first open). | Performance trace. |

### 3.2 Reliability
| ID | Target |
|---|---|
| NFR-R1 | Auto-reconnect with exponential backoff and jitter (1 s → 30 s max). |
| NFR-R2 | **No silent gaps:** after a reconnect the client re-fetches the snapshot and replays nothing stale. Every quote has a per-symbol version that rises by exactly 1; a jump, or a server `gap` flag, triggers a resync. |
| NFR-R3 | A stale-data warning shows if no tick arrives for 10 s during an open session. |
| NFR-R4 | Malformed messages are dropped and counted, never crash the board. |
| NFR-R5 | A render error in one panel shows a fallback for that panel only (error boundary), the rest keeps updating. |

### 3.3 Usability and accessibility
| ID | Target |
|---|---|
| NFR-U1 | **WCAG 2.2 AA** contrast for all market colors in both light and dark schemes (colors are tuned per scheme, not reused). |
| NFR-U2 | Color is never the only signal (▲ ▼ ■ markers, aria labels such as "up 2.1 %"). |
| NFR-U3 | Fully keyboard operable; visible focus ring; the drawer traps focus and restores it on close. |
| NFR-U4 | Respects `prefers-reduced-motion`: flashing becomes a static highlight. |
| NFR-U5 | Number formatting follows the chosen locale (VI: `1.234,5`, EN: `1,234.5`). |

### 3.4 Maintainability
| ID | Target |
|---|---|
| NFR-M1 | Every rule in §9 holds; ESLint 0 errors, 0 warnings; `strict` TS, no `any`. |
| NFR-M2 | Test coverage ≥ 80 % for `utils/`, `composables/`, `stores/`, `workers/`. |
| NFR-M3 | The data source is swappable (mock ↔ SSI) by changing one adapter, with no UI change. |
| NFR-M4 | Adding a new board tab or column is a change in `constants/` plus at most one component. |

### 3.5 Compatibility, security, observability
| ID | Target |
|---|---|
| NFR-C1 | Latest 2 versions of Chrome, Edge, Firefox, Safari. |
| NFR-S1 | No `v-html`; search input is escaped; CSP-compatible build (no inline eval); URLs from env, never hard-coded. |
| NFR-O1 | Dev-only perf overlay: messages/s, dropped messages, batch size, render time, tick-to-paint p95, heap. Stripped from production builds. |
| NFR-O2 | No `console.*` in production; errors go through one `reportError` function. |

---

## 4. Traceability: requirement → decision

| Requirement | Design decision / optimization |
|---|---|
| FR-01, NFR-P2 | **Virtualized rows** (`v-virtual-scroll`): only visible rows (~40) exist in the DOM, whatever the board size. |
| NFR-P1, NFR-P2 | **Web Worker** parses and validates messages, merges deltas and aggregates bars off the main thread; the main thread gets one batched patch per frame. |
| NFR-P1, NFR-P2 | **rAF batching**: one store update per animation frame, not per message. |
| NFR-P2 | **`shallowRef` Map** in the market store plus per-row `v-memo` on `[version, isWatched]`; a tick re-renders only its own row. |
| NFR-P2, FR-04 | **CSS-only flash**: a class toggle plus a `@keyframes` background animation (compositor-only, no layout). No JS timers per cell. |
| NFR-P2 | **Delta messages**: the backend sends only changed fields plus a version; the worker merges them. Smaller frames, less parsing. |
| NFR-P2 | **Cached `Intl.NumberFormat`** instances per locale and unit; formatting never allocates a formatter per cell. |
| NFR-P3, NFR-P4 | Lazy route, `defineAsyncComponent` for the drawer, heatmap and alert center; `lightweight-charts` and the treemap library are separate chunks; Vuetify tree-shaken via `vite-plugin-vuetify`. |
| NFR-P5 | All buffers are capped ring buffers (trades 500, bars per timeframe 500, sparkline 300); charts and observers are disposed on unmount. |
| NFR-P6 | Pre-built lowercase search index (symbol + normalized company name without diacritics), prefix match first. |
| NFR-R1, NFR-R2 | The worker's `FeedController` owns backoff and dead-socket detection; `FeedEngine` tracks versions and asks for a resync on a gap; `useMarketFeed` loads the snapshot. |
| NFR-R4 | Runtime type guards in the worker; bad frames counted in the perf overlay. |
| NFR-R5 | `ErrorBoundary.vue` using `onErrorCaptured` around each panel. |
| NFR-U1, FR-02, FR-42 | Market colors are M3 theme tokens defined separately for light and dark; contrast checked in a unit test. |
| NFR-U4 | Flash animation wrapped in `@media (prefers-reduced-motion: no-preference)`. |
| NFR-M3 | Backend `MarketDataSource` interface; the simulator implements it today, an SSI relay would implement it later. The browser-facing wire format doesn't change. |
| NFR-M4 | Board tabs and columns are declared as config in `constants/boards.ts` and `constants/priceBoardColumns.ts`. |
| NFR-O1 | `usePerfStore` + `PerfOverlay.vue` (lazy chunk), mounted only when `import.meta.env.DEV`. |

---

## 5. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Vue 3.5, Composition API, `<script setup>` | Vue Patterns; 3.5 adds reactive props destructure, `useTemplateRef()`, `onWatcherCleanup()`, `useId()` |
| UI library | **Vuetify 4 only** (md3 blueprint) | Native M3 with light/dark schemes; `v-virtual-scroll`, `v-navigation-drawer`, `v-data-table` building blocks. No Tailwind/Bootstrap mix (it caused conflicts on a sibling project). |
| State | Pinia Setup Stores | Vue Patterns |
| Charts | `lightweight-charts` | Built for financial series: candles, volume, price lines |
| Heatmap | `d3-hierarchy` (treemap layout only) rendered with SVG | Small, layout-only dependency; rendering stays in Vue |
| Off-main-thread | Web Worker via Vite `?worker` import, typed messages | NFR-P1/P2 |
| i18n | `vue-i18n` | FR-43, NFR-U5 |
| Drag & drop | `vue-draggable-plus` | Column and watchlist reorder (FR-05, FR-30) |
| Backend | Node.js + Express + `ws` (+ `permessage-deflate`) | Thin mock; one language across the stack |
| Testing | Vitest, `@vue/test-utils`, `@pinia/testing`, Playwright | Vue Patterns testing stack |
| Tooling | Vite, TypeScript strict, ESLint flat config, `rollup-plugin-visualizer` | Same shape as sibling projects; bundle budget (NFR-P4) |
| Styling | Plain CSS + CSS variables, Stylelint (`stylelint-config-standard`, `stylelint-config-recommended-vue`), `@fontsource/roboto` | One token system, no SCSS; self-hosted font avoids a render-blocking request (NFR-P3) |

---

## 6. Architecture

```
mine-trade-guru/
  frontend/   Vue 3.5 + Vuetify 4 (md3 blueprint) + TypeScript + Vite + Pinia
  backend/    Node.js 22 + Express 5 + ws: market simulator + REST
  docs/       this plan, architecture note, design system, performance results
```

Data path:

```
backend simulator ──ws batch {ts, gap, frames[]}──▶ tickWorker (Web Worker)
        │                                            FeedController: socket, backoff, idle check
        │ REST snapshot / history                    FeedEngine: validate, merge deltas by version,
        ▼                                                        detect gaps, extract tracked trades
  marketApi ──▶ stores ◀── ≤ 1 patch per 50 ms, merged per animation frame (useMarketFeed)
                  │
                  ▼
        containers ─props─▶ presentational components
```

### 6.1 Wire protocol (mirrors SSI FastConnect Data channels)

| Channel | Payload | Used by |
|---|---|---|
| `X` | Quote delta: `{ symbol, v, ...changedFields }`, incl. the last matched trade | Board, tape, chart, volume-by-price |
| `R` | Foreign buy/sell/room delta (shares the quote's `v`) | Foreign columns and flow panel |
| `MI` | Full index quote incl. advancers/decliners/ceiling/floor counts | Ticker bar |
| `F` | Session state per market (`PRE_OPEN` … `CLOSED`, next phase, market clock) | Session indicator (FR-15) |

SSI's `B` (bar) channel is not used: the client builds 1-minute bars from the
trades it already receives, so the drawer needs no extra subscription.

Each quote has a **version `v` per symbol** that goes up by exactly 1 on every
`X` or `R` change. The worker applies `v + 1`, ignores anything older, and on any
other jump asks for a fresh snapshot (NFR-R2). Frames are sent in batches every
100 ms as `{ type: 'batch', ts, gap, frames }`; `ts` is the server send time
(NFR-P1 latency), and `gap: true` means the server dropped frames for this client
under backpressure, which also triggers a resync. Heartbeats (`{ type: 'hb' }`)
every 5 s let the client detect a dead socket. Client → server: `subscribe` /
`unsubscribe` by channel.

### 6.2 Backend

- `src/server.ts` / `startServer.ts` / `app.ts`: Express + `ws` on one HTTP server,
  `permessage-deflate` on, origin check on REST (CORS) and WebSocket upgrades.
- `src/config.ts`: env config (`PORT`, `ALLOWED_ORIGINS`, `SESSION_MODE`
  simulated / live / always-open, `SESSION_SPEED`, `SYMBOL_COUNT`,
  `TICKS_PER_SECOND`, `TRADE_HISTORY_LIMIT` …), validated at start.
- `src/market/types.ts`: canonical wire types; mirrored 1:1 in frontend `interfaces/`.
- `src/market/source.ts`: the `MarketDataSource` interface (NFR-M3). The simulator
  implements it; a real SSI adapter would implement the same interface.
- `src/market/instruments.ts`: seed catalogue (real VN30/HNX30/UPCOM tickers, ETFs,
  covered warrants, VN30F futures) plus generated tickers for stress size.
- `src/market/rules.ts`: daily bands (HOSE ±7 %, HNX ±10 %, UPCOM ±15 %,
  futures ±7 %, CW from its underlying) and tick-size tiers.
- `src/market/session.ts`: session state machine on the HOSE/HNX/UPCOM/derivatives
  timetables, day roll at 15:05.
- `src/market/simulator.ts`: seeded random walk within bands and tick sizes; emits
  delta frames, trades, index updates; keeps capped history (trades, 1-minute bars,
  volume by price) for REST.
- `src/ws/gateway.ts`: per-connection subscriptions, 100 ms batching, backpressure
  `gap` flag, heartbeat and ping.
- REST:
  - `GET /api/instruments` catalogue
  - `GET /api/snapshot` all quotes, indices and sessions (with versions)
  - `GET /api/quotes/:symbol/trades` session tape
  - `GET /api/quotes/:symbol/bars` session 1-minute bars
  - `GET /api/quotes/:symbol/volume-by-price` session volume profile
  - `GET /api/indices/:code/history` intraday index points
  - `GET /health`

### 6.3 Stress mode
`npm run dev:stress` runs 1,500 symbols at 5 updates/s each with the market always
open. That's the load NFR-P2/P3 are measured against (see
[performance.md](performance.md)).

### 6.4 Frontend layout (Vue Patterns, feature-first)

```
src/
  interfaces/      all types: market, websocket, worker, session, board, alert,
                   watchlist, settings, theme, chart, overview, perf, ui
  constants/       all literal/config values: themeColors (only file with hex), boards,
                   priceBoardColumns, market, marketColors, sessions, feed, limits,
                   alerts, settings, shortcuts, icons, timeframes, storageKeys, api,
                   routes, connection, overview, injectionKeys
  api/             network only: httpClient, marketApi (validated REST), marketSocket
  workers/         tickWorker (entry), feedController (socket lifecycle),
                   feedEngine (pure state machine, unit-tested)
  composables/     useMarketFeed, useLocalStorage, useFormatContext, usePriceFlash,
                   usePriceAlerts, useNotifications, useAlertText, useKeyboardShortcuts,
                   useSymbolSearch, useLightweightChart, useChartPalette, useThemeMode,
                   useAppLocale, useNow, useFullscreen, useElementSize
  stores/          Pinia Setup Stores: market, instrument, symbolDetail, watchlist, alert,
                   session, connection, board, settings, perf
  utils/           pure functions: priceColor, priceMarker, priceFormat, numberFormat,
                   boardCell, columnValue, quoteSort, boardFilter, marketBreadth,
                   topMovers, foreignFlow, heatmapLayout, barAggregate, chartData,
                   volumeByPrice, alertEvaluate, alertFormat, searchIndex, csv,
                   typeGuards, storageParsers, ringBuffer, patchMerge, backoff,
                   contrast, stats, time, instrument, id
  styles/          tokens.css, base.css, motion.css
  plugins/         vuetify.ts, i18n.ts
  locales/         vi.json, en.json
  components/
    base/          Base{Button,IconButton,Card,Chip,Badge,Tooltip,Dialog,Menu,
                   TextField,Select,Switch,Tabs,EmptyState,Skeleton,ErrorState}
    common/        ErrorBoundary, PerfOverlay (dev only)
    features/
      layout/          AppHeader (container), GlobalSearch (container), SessionIndicator,
                       ConnectionIndicator, SettingsMenu, ShortcutHelpDialog, StaleDataBanner
      market-overview/ IndexTickerBar (container), MarketOverview (container),
                       IndexChartCard, IndexChart (lazy), IndexTable, MarketBreadthPanel,
                       TopMoversPanel, ForeignFlowPanel, SectorHeatmap (lazy)
      price-board/     PriceBoard (container), PriceBoardToolbar, BoardTabs, SectorFilter,
                       ColumnSettingsMenu, PriceBoardHeader, PriceBoardBody (virtual),
                       PriceBoardRow (v-memo), PriceCell, VolumeCell, PriceBoardCardList
      symbol-detail/   SymbolDetailDrawer (container, lazy), SymbolHeader, TimeframeToggle,
                       CandleChart, OrderBookDepth, TradeTape (virtual), VolumeByPrice, KeyStats
      watchlist/       WatchlistManager (container, lazy), WatchlistToggleButton
      alerts/          AlertCenter (container, lazy), AlertToastHost (container),
                       AlertRuleForm, AlertEventList, AlertToast
  layouts/         DefaultLayout
  pages/           DashboardPage (starts the feed, owns URL sync and dialogs), NotFoundPage
  router/          /board/:boardId? (one route, so tab changes never restart the feed)
```

Only `pages/*` and the components marked **container** read stores, call APIs or
start side effects. Everything else takes props and emits events.


## 7. Real market data: SSI FastConnect Data API

From SSI's public docs
([guide](https://guide.ssi.com.vn/ssi-products/fastconnect-data),
[GitHub](https://github.com/SSI-Securities-Corporation/docs)): a real WebSocket feed
exists (`wss://fc-datahub.ssi.com.vn/v2.0`) with channels `X`, `F`, `B`, `R`, `MI`.
Getting `ConsumerID`/`ConsumerSecret` requires an SSI branch visit or remote KYC,
so there's no key for this build.

**Decision:** the simulator speaks the same channel codes and field meaning, and sits
behind the backend's `MarketDataSource` interface. A real SSI adapter would implement
that interface in the backend (as a relay that holds the secret and maps SSI's payload
to `market/types.ts`); the wire format to the browser and all frontend code stay the
same (NFR-M3). The SSI secret never reaches the browser.


---

## 8. Design system (colors, CSS variables, styling rules)

Full spec: **[docs/design-system.md](design-system.md)**. Summary:

- **Color set:** complete M3 role palette (primary, secondary, tertiary, error,
  surface + 5 surface-container tones, outline, inverse…) for **light and dark**,
  seed `#0B57D0`, dark as default. Plus 5 market tokens, tuned per scheme to pass
  WCAG AA:

  | Token | Meaning | Light | Dark | Marker |
  |---|---|---|---|---|
  | `market-ceiling` | trần | `#A1119E` | `#F23AF5` | ▲ |
  | `market-floor` | sàn | `#006A8A` | `#22D3EE` | ▼ |
  | `market-reference` | tham chiếu | `#7A5D00` | `#F5C518` | ■ |
  | `market-up` | tăng | `#08703A` | `#1FD17B` | ▲ |
  | `market-down` | giảm | `#C62828` | `#FF5C5C` | ▼ |

- **Where they live:** hex values only in `constants/themeColors.ts` → Vuetify
  theme (`md3` blueprint) → auto-generated `--v-theme-*` CSS variables and
  `text-*`/`bg-*` classes. Hover, flash, depth bars and the heatmap scale are
  derived with `color-mix()` (never `rgb(var(--v-theme-x) / alpha)`, which is invalid with Vuetify's comma triplets), never new hex.
- **CSS variables:** non-color tokens as `--mtg-*` in `styles/tokens.css`:
  spacing (4 px grid), M3 shape scale, type scale, state-layer opacities, M3
  motion durations/easings, flash, focus ring, board metrics with
  `[data-density]` / `[data-font-scale]` variants, layout sizes.
- **Rules:** C1–C8 for color, S1–S7 for CSS, enforced by Stylelint, an ESLint
  hex-literal ban, a WCAG contrast test and a light/dark key-parity test.

---

## 9. Code rules (Vue Patterns; enforced in review and lint)

### 9.1 Folder ownership
- `interfaces/` only types; `constants/` only literal/config values; neither has
  logic. No other file declares a shared shape or a magic literal.
- `api/` network I/O only; `utils/` pure functions only; `workers/` no Vue imports;
  `composables/` reusable reactive logic; `stores/` global state.

### 9.2 Components
- One job per component: container **or** presentational (§6.4).
- Presentational: props in, events out; no stores, no APIs, no side-effectful
  composables.
- `components/base/*` wrap Vuetify; feature code never uses raw `<v-btn>`,
  `<v-card>`, `<v-chip>`, etc.
- SFC block order: **`<template>`, then `<script setup lang="ts">`, then
  `<style scoped>`** (project decision; enforced by ESLint `vue/block-order`).
- Script order: imports (vue → ecosystem → `@/` → relative), props/emits/slots,
  composables, local state, computed, methods, watchers, lifecycle hooks.
- A component over ~200 lines of template is split.

### 9.3 Props, events, v-model
- Type-based `defineProps<Props>()`; Vue 3.5 reactive destructure for defaults;
  watch destructured props through a getter.
- Booleans named `isXxx` / `hasXxx` / `canXxx`.
- Never mutate props; typed `defineEmits`, or `defineModel()` for two-way binding.
- camelCase events in script, kebab-case in templates.

### 9.4 Composables
- `useXxx`, one responsibility, return refs/computed.
- Inputs as `MaybeRef<T>`, read with `toValue()`.
- No module-scope side effects; clean up in `onUnmounted` / `onWatcherCleanup()`.

### 9.5 Types
- `strict`, no `any`, no non-null `!` without a comment.
- Wire frames validated at runtime (`typeGuards.ts`) before use.

### 9.6 State
- Setup Store syntax, files `useXxxStore.ts`, one store per concern.
- Only actions mutate; components use `storeToRefs()` + actions.
- Async actions handle loading, success and error.
- High-frequency data (quotes) uses `shallowRef` + version counters, never deep
  `reactive`.

### 9.7 Templates
- `v-for` keys are stable ids (symbol, trade id), never index.
- No `v-if` with `v-for` on one element; filter in a computed.
- `v-show` for frequent toggles; no `v-html`.
- `useTemplateRef()` for DOM refs; `useId()` for form/aria ids.

### 9.8 Styling
Color rules **C1–C8** and CSS rules **S1–S7** in
[design-system.md §7](design-system.md#7-rules) apply in full. In short: hex only
in `themeColors.ts`; colors via Vuetify props/classes or `rgb(var(--v-theme-x))`;
non-color values only from `--mtg-*` tokens; plain scoped CSS, no SCSS, no
`!important`; numbers use `.mtg-num`; animations only on
`transform`/`opacity`/`background-color` with a reduced-motion fallback.

### 9.9 Naming
- `PascalCase.vue` (multi-word); `useCamelCase.ts` for composables and stores;
  `camelCase.ts` for everything else in TS; kebab-case feature folders.
- `Base*` for primitives; feature components prefixed by area (`PriceBoard*`,
  `Index*`, `Symbol*`, `Alert*`).

### 9.10 Performance rules
- No store write per message; always through the worker batch.
- No `Intl.NumberFormat` / `Date` formatter created inside a render path.
- No unbounded array: every growing collection uses `ringBuffer.ts`.
- Heavy panels (`SectorHeatmap`, `SymbolDetailDrawer`, `AlertCenter`) are async
  components.

---

## 10. Build order (tickets)

| # | Ticket | Covers |
|---|---|---|
| 1 | Scaffold frontend + backend, lint/test/typecheck scripts, bundle visualizer | NFR-M1, P4 |
| 2 | Backend: instruments, rules, session machine, simulator with versioned deltas, REST, subscriptions, stress mode | FR-01, 15, NFR-R2, P2 |
| 3 | Frontend foundation: interfaces, constants, design system (`themeColors.ts`, `styles/tokens.css`/`base.css`/`motion.css`, Vuetify md3 theme light/dark), Stylelint + hex ban, contrast test, i18n, utils + tests | FR-02, 42, 43, NFR-U1 |
| 4 | `tickWorker` + `useMarketFeed` (backoff, version/gap resync, pause) + stores + tests | NFR-P1, P2, R1–R4 |
| 5 | Base components + ErrorBoundary + PerfOverlay | NFR-R5, O1 |
| 6 | Price board: tabs, grouped header, virtual body, row/cell, flash, sort, columns, units, density, pin | FR-01–08, NFR-P2 |
| 7 | Header: search, session indicator, connection indicator, settings, shortcuts | FR-15, 40–45 |
| 8 | Market overview: ticker bar, breadth, movers, foreign flow | FR-10–13 |
| 9 | Symbol drawer: candles + timeframes, depth, tape, volume by price, key stats | FR-20–25 |
| 10 | Watchlists (multi, drag, CSV) | FR-30, 31 |
| 11 | Alerts: rules, center, toast/notification/sound | FR-32, 33 |
| 12 | Sector heatmap | FR-14 |
| 13 | Responsive tablet/phone layouts | FR-46 |
| 14 | Performance pass against every NFR-P target in stress mode; fix, re-measure, record results in `docs/performance.md` | NFR-P1–P7 |
| 15 | E2E smoke tests, `docker-compose.yml`, README | DoD |

---

## 11. Testing

- **Unit (Vitest):** everything in `utils/` (color, marker, breadth, movers, sort,
  bar aggregation, volume by price, ring buffer, backoff, search index, CSV, type
  guards, contrast).
- **Worker:** delta merge, bar aggregation, buffer caps, malformed frame handling.
- **Composables:** `useMarketFeed` (backoff, resync on version gap, pause) with a mocked
  WebSocket and fake timers; `usePriceAlerts`, `useSymbolSearch`, `useKeyboardShortcuts`.
- **Stores:** market patch apply + versioning, watchlist CRUD/persist, alert rules.
- **Components:** presentational with props only (emits, color tokens, markers);
  containers with `createTestingPinia()`.
- **Theme:** every market token and `on-*` role passes 4.5:1 against its surface
  in both schemes (C7); `LIGHT_SCHEME` and `DARK_SCHEME` have identical keys.
- **Style lint:** `stylelint` runs in `npm run lint` and CI; the hex-literal ESLint
  rule fails on any hex outside `themeColors.ts`.
- **Benchmarks (Vitest bench):** search over 1,500 symbols, worker merge of a
  1,500-symbol batch.
- **E2E (Playwright):** board fills; a price updates; switch tab; open drawer;
  add to watchlist, reload, still there; theme persists; keyboard flow; backend
  restart → reconnect indicator → recovers.

---

## 12. Definition of Done

- `typecheck`, `lint` (0 warnings), `test:unit` (coverage per NFR-M2), `build` pass
  in both packages.
- Every FR in §2 demonstrable in the running app.
- Every NFR-P target met in stress mode, with numbers recorded in
  `docs/performance.md`.
- Reconnect, resync and stale-data warning verified by stopping and restarting the
  backend.
- Both themes pass the contrast test; keyboard-only walkthrough works.
- No rule in §9 broken (review).

---

## 13. Risks and open questions

- **No real data** (§7). The adapter design keeps the swap small, and the real
  adapter belongs in the backend so credentials never reach the browser.
- **Rules are simplified**: tick-size tiers and session timetable follow published
  exchange rules but aren't certified; fine for a mock, must be verified before
  real use.
- **Browser notifications and sound** need permission / a user gesture; the app
  falls back to in-app toasts.
- **Heatmap cost** at 1,500 symbols: layout runs only on board change or every few
  seconds, never per tick.
- **Scope is large.** Tickets 1–9 are the core; 10–13 can be cut or deferred
  without affecting the architecture.
