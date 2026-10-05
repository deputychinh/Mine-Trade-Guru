import { API_BASE_URL } from '@/constants/api'
import { HTTP_TIMEOUT_MS } from '@/constants/limits'

export type HttpErrorKind = 'http' | 'network' | 'timeout' | 'invalid-response' | 'aborted'

export class HttpError extends Error {
  constructor(
    readonly kind: HttpErrorKind,
    message: string,
    readonly status: number | null = null,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/** Thin fetch wrapper: JSON only, a hard timeout, typed errors. No retries here — callers decide. */
export async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, HTTP_TIMEOUT_MS)
  const onExternalAbort = () => controller.abort()
  signal?.addEventListener('abort', onExternalAbort, { once: true })

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) throw new HttpError('http', `GET ${path} failed with ${response.status}`, response.status)
    return (await response.json()) as unknown
  } catch (error) {
    if (error instanceof HttpError) throw error
    if (timedOut) throw new HttpError('timeout', `GET ${path} timed out`)
    if (signal?.aborted) throw new HttpError('aborted', `GET ${path} was cancelled`)
    if (error instanceof SyntaxError) throw new HttpError('invalid-response', `GET ${path} returned invalid JSON`)
    throw new HttpError('network', `GET ${path} could not reach the server`)
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onExternalAbort)
  }
}
