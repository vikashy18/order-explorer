import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { isAbortError } from '../api/client'
import type { QueryCache } from './queryCache'

export type QueryStatus = 'loading' | 'success' | 'error'

export interface QueryResult<T> {
  status: QueryStatus
  /** Data for the *current* key only. Never data from a previous key. */
  data: T | undefined
  error: Error | undefined
  retry: () => void
}

interface State<T> {
  key: string | null
  status: QueryStatus
  data: T | undefined
  error: Error | undefined
}

/**
 * Fetches data for `key` and guarantees only the response for the latest key
 * is ever shown:
 *  - changing the key aborts the in-flight request (AbortController), and
 *  - a response is also dropped if its request id is no longer the latest, in
 *    case a fetcher ignores the abort signal.
 * Results are keyed, so `data` can never belong to a different key than the
 * one passed in on this render.
 */
export function useLatestQuery<T>(
  key: string | null,
  fetcher: (signal: AbortSignal) => Promise<T>,
  cache?: QueryCache<T>,
): QueryResult<T> {
  const [state, setState] = useState<State<T>>({ key: null, status: 'loading', data: undefined, error: undefined })
  const [attempt, setAttempt] = useState(0)
  const latestRequestId = useRef(0)

  const fetcherRef = useRef(fetcher)
  useLayoutEffect(() => {
    fetcherRef.current = fetcher
  })

  useEffect(() => {
    if (key === null) return
    const requestId = ++latestRequestId.current

    const cached = cache?.get(key)
    if (cached !== undefined) {
      setState({ key, status: 'success', data: cached, error: undefined })
      return
    }

    const controller = new AbortController()
    setState({ key, status: 'loading', data: undefined, error: undefined })

    fetcherRef.current(controller.signal).then(
      (data) => {
        if (controller.signal.aborted || requestId !== latestRequestId.current) return
        cache?.set(key, data)
        setState({ key, status: 'success', data, error: undefined })
      },
      (error: unknown) => {
        if (isAbortError(error) || controller.signal.aborted || requestId !== latestRequestId.current) return
        setState({
          key,
          status: 'error',
          data: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      },
    )

    return () => controller.abort()
  }, [key, attempt, cache])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  // Between a key change and the effect running, `state` still describes the
  // old key. Resolve from cache or report loading rather than leaking it.
  if (state.key !== key) {
    const cached = key === null ? undefined : cache?.get(key)
    return cached !== undefined
      ? { status: 'success', data: cached, error: undefined, retry }
      : { status: 'loading', data: undefined, error: undefined, retry }
  }
  return { status: state.status, data: state.data, error: state.error, retry }
}
