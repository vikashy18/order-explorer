import { describe, expect, it } from 'vitest'
import type { OrdersQuery } from '../types'
import { DEFAULT_QUERY, filtersKey, listKey, parseQuery, serializeQuery } from './urlState'

describe('URL state', () => {
  it('round-trips every field so a shared link restores the exact view', () => {
    const query: OrdersQuery = {
      q: 'asha',
      status: ['paid', 'shipped'],
      channel: 'web',
      country: 'IN',
      min: 1000,
      max: 50000,
      sort: 'amount',
      dir: 'asc',
      page: 7,
      size: 250,
    }
    const url = serializeQuery(query).toString()
    expect(parseQuery(new URLSearchParams(url))).toEqual(query)
  })

  it('keeps the default view at a clean URL', () => {
    expect(serializeQuery(DEFAULT_QUERY).toString()).toBe('')
  })

  it('sanitizes hand-edited or malicious params instead of crashing', () => {
    const parsed = parseQuery(
      new URLSearchParams('status=paid,bogus,paid&channel=fax&page=-3&size=9999&sort=__proto__&dir=up&min=abc&max=-5'),
    )
    expect(parsed).toEqual({ ...DEFAULT_QUERY, status: ['paid'] })
  })

  it('does not refetch for whitespace-only search changes, and summary ignores paging', () => {
    expect(listKey({ ...DEFAULT_QUERY, q: 'asha ' })).toBe(listKey({ ...DEFAULT_QUERY, q: 'asha' }))
    expect(filtersKey({ ...DEFAULT_QUERY, page: 9, sort: 'amount' })).toBe(filtersKey(DEFAULT_QUERY))
  })
})
