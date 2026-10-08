import { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router'
import type { OrdersQuery } from '../types'
import { DEFAULT_QUERY, parseQuery, serializeQuery } from './urlState'

interface HistoryState {
  typing?: boolean
}

export interface UpdateOptions {
  /**
   * Text edits (search, amount) replace the history entry they created, so a
   * burst of typing is one Back step instead of one per debounce tick.
   */
  typing?: boolean
}

export function useQueryState() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const query = useMemo(() => parseQuery(params), [params])
  const lastEntryWasTyping = (location.state as HistoryState | null)?.typing === true

  // Normalise hand-edited or outdated links (e.g. ?page=abc) to their canonical form.
  useEffect(() => {
    const canonical = serializeQuery(query)
    if (canonical.toString() !== params.toString()) {
      setParams(canonical, { replace: true, state: location.state })
    }
  }, [query, params, setParams, location.state])

  const update = useCallback(
    (patch: Partial<OrdersQuery>, options: UpdateOptions = {}) => {
      const next: OrdersQuery = { ...query, ...patch }
      // Any change other than paging invalidates the current page number.
      if (!('page' in patch)) next.page = 1
      const typing = options.typing === true
      setParams(serializeQuery(next), {
        replace: typing && lastEntryWasTyping,
        state: typing ? ({ typing: true } satisfies HistoryState) : null,
      })
    },
    [query, setParams, lastEntryWasTyping],
  )

  const reset = useCallback(() => {
    setParams(serializeQuery({ ...DEFAULT_QUERY, size: query.size }))
  }, [setParams, query.size])

  return { query, update, reset }
}
