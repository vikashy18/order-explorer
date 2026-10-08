import { DEFAULT_QUERY, serializeQuery } from '../lib/urlState'
import type { OrderDetail, OrdersPage, OrdersQuery, OrdersSummary } from '../types'

export type ApiErrorKind = 'network' | 'server' | 'not-found'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined

  constructor(message: string, kind: ApiErrorKind, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function request<T>(url: string, signal: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 'network')
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    if (response.status === 404) throw new ApiError(body?.message ?? 'Not found', 'not-found', 404)
    throw new ApiError(
      `The server failed to respond (HTTP ${response.status}). This is usually temporary.`,
      'server',
      response.status,
    )
  }
  return (await response.json()) as T
}

function apiParams(query: OrdersQuery): string {
  return serializeQuery({ ...query, q: query.q.trim() }).toString()
}

export function fetchOrders(query: OrdersQuery, signal: AbortSignal): Promise<OrdersPage> {
  return request(`/api/orders?${apiParams(query)}`, signal)
}

export function fetchSummary(query: OrdersQuery, signal: AbortSignal): Promise<OrdersSummary> {
  const filtersOnly = { ...query, sort: DEFAULT_QUERY.sort, dir: DEFAULT_QUERY.dir, page: 1, size: DEFAULT_QUERY.size }
  return request(`/api/orders/summary?${apiParams(filtersOnly)}`, signal)
}

export function fetchOrder(id: string, signal: AbortSignal): Promise<OrderDetail> {
  return request(`/api/orders/${encodeURIComponent(id)}`, signal)
}
