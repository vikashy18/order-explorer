import {
  CHANNELS,
  COUNTRIES,
  ORDER_STATUSES,
  PAGE_SIZES,
  SORT_FIELDS,
  type OrdersQuery,
} from '../types'

export const DEFAULT_QUERY: OrdersQuery = {
  q: '',
  status: [],
  channel: '',
  country: '',
  min: null,
  max: null,
  sort: 'createdAt',
  dir: 'desc',
  page: 1,
  size: 100,
}

const MAX_SEARCH_LENGTH = 100

function oneOf<T extends string | number>(allowed: readonly T[], value: unknown): T | undefined {
  return allowed.find((candidate) => String(candidate) === value)
}

function parseAmount(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : null
}

function parsePositiveInt(raw: string | null, fallback: number): number {
  if (raw === null || !/^\d+$/.test(raw)) return fallback
  const value = Number(raw)
  return value >= 1 && Number.isSafeInteger(value) ? value : fallback
}

/**
 * Turns untrusted URL params into a fully valid query. Anything unknown or
 * malformed falls back to its default, so a hand-edited or outdated link
 * still renders a sensible view instead of an error.
 */
export function parseQuery(params: URLSearchParams): OrdersQuery {
  const requestedStatuses = new Set((params.get('status') ?? '').split(','))
  return {
    q: (params.get('q') ?? '').slice(0, MAX_SEARCH_LENGTH),
    status: ORDER_STATUSES.filter((s) => requestedStatuses.has(s)),
    channel: oneOf(CHANNELS, params.get('channel')) ?? '',
    country: oneOf(COUNTRIES, params.get('country')) ?? '',
    min: parseAmount(params.get('min')),
    max: parseAmount(params.get('max')),
    sort: oneOf(SORT_FIELDS, params.get('sort')) ?? DEFAULT_QUERY.sort,
    dir: params.get('dir') === 'asc' ? 'asc' : params.get('dir') === 'desc' ? 'desc' : DEFAULT_QUERY.dir,
    page: parsePositiveInt(params.get('page'), DEFAULT_QUERY.page),
    size: oneOf(PAGE_SIZES, params.get('size')) ?? DEFAULT_QUERY.size,
  }
}

/** Serializes a query in a stable key order, omitting defaults to keep shared links short. */
export function serializeQuery(query: OrdersQuery): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.status.length) params.set('status', query.status.join(','))
  if (query.channel) params.set('channel', query.channel)
  if (query.country) params.set('country', query.country)
  if (query.min !== null) params.set('min', String(query.min))
  if (query.max !== null) params.set('max', String(query.max))
  if (query.sort !== DEFAULT_QUERY.sort) params.set('sort', query.sort)
  if (query.dir !== DEFAULT_QUERY.dir) params.set('dir', query.dir)
  if (query.page !== DEFAULT_QUERY.page) params.set('page', String(query.page))
  if (query.size !== DEFAULT_QUERY.size) params.set('size', String(query.size))
  return params
}

/** Cache/request key for the list: whitespace-only differences in search must not refetch. */
export function listKey(query: OrdersQuery): string {
  return serializeQuery({ ...query, q: query.q.trim() }).toString()
}

/** Key for data that depends only on filters (not sort/page), e.g. the summary. */
export function filtersKey(query: OrdersQuery): string {
  return listKey({
    ...query,
    sort: DEFAULT_QUERY.sort,
    dir: DEFAULT_QUERY.dir,
    page: DEFAULT_QUERY.page,
    size: DEFAULT_QUERY.size,
  })
}

export function hasActiveFilters(query: OrdersQuery): boolean {
  return filtersKey(query) !== ''
}
