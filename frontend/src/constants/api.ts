import type { IndexCode } from '@/interfaces/market'

/** Same-origin by default: Vite (dev/preview) and nginx (prod) proxy /api and /ws to the backend. */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** Empty = derive ws(s)://<current host>/ws at runtime. */
export const WS_URL_OVERRIDE: string = import.meta.env.VITE_WS_URL ?? ''

export const API_ROUTES = {
  instruments: () => '/instruments',
  snapshot: () => '/snapshot',
  trades: (symbol: string) => `/quotes/${encodeURIComponent(symbol)}/trades`,
  bars: (symbol: string) => `/quotes/${encodeURIComponent(symbol)}/bars`,
  volumeByPrice: (symbol: string) => `/quotes/${encodeURIComponent(symbol)}/volume-by-price`,
  indexHistory: (code: IndexCode) => `/indices/${encodeURIComponent(code)}/history`,
} as const
