import { describe, expect, it } from 'vitest'
import { DEFAULT_QUERY } from '../lib/urlState'
import { getOrders, TOTAL_ORDERS } from './data'
import { queryOrders, summarizeOrders } from './query'

describe('mock API query engine', () => {
  const orders = getOrders()

  it('serves a large, deterministic dataset', () => {
    expect(orders).toHaveLength(TOTAL_ORDERS)
    expect(TOTAL_ORDERS).toBeGreaterThanOrEqual(10_000)
    expect(getOrders()[0]).toEqual(orders[0])
  })

  it('filters, sorts and paginates consistently with the summary', () => {
    const query = { ...DEFAULT_QUERY, status: ['paid' as const], country: 'IN' as const, sort: 'amount' as const, dir: 'asc' as const, size: 50 as const }
    const page1 = queryOrders(orders, query)
    const page2 = queryOrders(orders, { ...query, page: 2 })

    expect(page1.total).toBe(summarizeOrders(orders, query).count)
    expect(page1.items.every((o) => o.status === 'paid' && o.country === 'IN')).toBe(true)
    const amounts = [...page1.items, ...page2.items].map((o) => o.amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => a - b))
    // No row appears on two pages, thanks to the id tie-break.
    const ids = new Set([...page1.items, ...page2.items].map((o) => o.id))
    expect(ids.size).toBe(page1.items.length + page2.items.length)
  })

  it('returns an empty page (with the real total) when the page is out of range', () => {
    const result = queryOrders(orders, { ...DEFAULT_QUERY, page: 10_000 })
    expect(result.items).toEqual([])
    expect(result.total).toBe(TOTAL_ORDERS)
    expect(result.pageCount).toBe(Math.ceil(TOTAL_ORDERS / DEFAULT_QUERY.size))
  })
})
