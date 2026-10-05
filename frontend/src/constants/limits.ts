// Every growing collection has a cap (NFR-P5, rule 9.10).
export const TRADE_TAPE_LIMIT = 500
export const BAR_LIMIT = 500
export const SPARKLINE_POINTS = 300
export const ALERT_EVENT_LIMIT = 200
export const TICK_TO_PAINT_SAMPLES = 200

export const TOP_MOVERS_COUNT = 10
export const FOREIGN_FLOW_COUNT = 10
export const SEARCH_RESULT_LIMIT = 8

/** Derived panels (breadth, movers, foreign flow) recompute at most this often, never per tick. */
export const OVERVIEW_THROTTLE_MS = 1_000
/** The heatmap layout is the heaviest computation; recompute even less often. */
export const HEATMAP_THROTTLE_MS = 3_000

export const HTTP_TIMEOUT_MS = 10_000

/** Board row heights in px, must match --mtg-board-row-height in styles/tokens.css (virtual scroll needs a number). */
export const BOARD_ROW_HEIGHT = { comfortable: 32, compact: 24, large: 36 } as const

/** Phone card-list item height in px (FR-46). */
export const BOARD_CARD_HEIGHT = 56

/** Treemap geometry in px (FR-14): sector header strip and gaps between tiles. */
export const HEATMAP_PADDING = { outer: 2, sectorHeader: 18, inner: 1 } as const

/**
 * Change-% thresholds for the 7-step heat scale (--mtg-heat-n3 … --mtg-heat-p3 in tokens.css).
 * A tile ≥ 4 % up is p3, ≥ 2 % is p2, any gain is p1; mirrored for losses.
 */
export const HEAT_THRESHOLDS = { strong: 4, medium: 2 } as const

/** NFR-P1 / NFR-P2 budgets; the dev overlay highlights values above them. */
export const PERF_BUDGET = { tickToPaintP95Ms: 100, applyPatchMs: 4 } as const

/** Detail drawer width in px; mirrors --mtg-drawer-width (Vuetify's drawer needs a number). */
export const DRAWER_WIDTH = 480

/** Time & sales row height in px (virtual list). */
export const TAPE_ROW_HEIGHT = 28

/** Largest watchlist CSV accepted for import; a real list is a few hundred bytes. */
export const WATCHLIST_IMPORT_MAX_BYTES = 64 * 1_024
