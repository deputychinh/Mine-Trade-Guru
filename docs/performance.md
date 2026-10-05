# Performance results

Measured on 1 October 2026 on a MacBook (Apple Silicon, 120 Hz display) in Chrome, with
the dev build and the in-app perf overlay. Numbers are from single runs, so treat them
as a sanity check, not a benchmark.

## Normal load (112 symbols, `always-open`)

| Metric | Target | Result |
|---|---|---|
| Tick-to-paint p50 / p95 (NFR-P1) | p95 < 100 ms | 40 ms / 64 ms |
| Store update per frame | < 4 ms | 0.1 ms |
| Network latency, server → worker | | 0.7 ms |

## Stress (1,500 symbols × 5 updates/s, `npm run dev:stress`, HOSE board)

| Metric | Target | Result |
|---|---|---|
| Frames received | ~7,500/s | ~8,900/s |
| Frame rate (NFR-P3) | ≥ 55 fps | 112.7 fps (display is 120 Hz) |
| Worst frame in 10 s | | 17.7 ms |
| Long tasks (> 50 ms) in 10 s | 0 | 0 |
| Tick-to-paint p50 / p95 | p95 < 100 ms | 58 ms / 77 ms |
| Same, with the symbol drawer open | ≥ 55 fps | 116.6 fps |
| Dropped frames / resyncs | 0 | 0 / 0 |
| Heap over 60 s (NFR-P5) | flat | 84–130 MB, sawtooth with flat lows |

The heap check covers one minute, not the full hour NFR-P5 asks for. The lows after
each GC didn't climb, but a one-hour run is still to do.

## Bundle (NFR-P4)

Production build, gzip, everything the dashboard route needs before first paint:
**228 KB** (budget 250 KB). The chart library (index charts, candles), the heatmap,
drag-and-drop, the symbol drawer, alert center and watchlist manager are separate
chunks loaded on first use.

## What makes it fast

- The WebSocket lives in a Web Worker. It validates and merges deltas and posts at
  most one patch every 50 ms.
- The main thread merges patches into one store update per animation frame. Quotes
  are a plain `Map` inside a `shallowRef`, triggered once per update.
- Board rows are virtualized (about 30 in the DOM) and `v-memo`'d on the quote
  object, so a tick re-renders only that symbol's row.
- The flash is a CSS animation; the code only swaps a class.
- Overview panels recompute at most once a second; the heatmap every 3 seconds.
