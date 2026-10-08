import { ORDER_STATUSES, type Order, type OrdersPage, type OrdersQuery, type OrdersSummary } from '../types'

export function filterOrders(orders: Order[], query: OrdersQuery): Order[] {
  const term = query.q.trim().toLowerCase()
  const statuses = query.status.length ? new Set(query.status) : null
  return orders.filter(
    (o) =>
      (!statuses || statuses.has(o.status)) &&
      (!query.channel || o.channel === query.channel) &&
      (!query.country || o.country === query.country) &&
      (query.min === null || o.amount >= query.min) &&
      (query.max === null || o.amount <= query.max) &&
      (!term ||
        o.id.toLowerCase().includes(term) ||
        o.customer.toLowerCase().includes(term) ||
        o.email.includes(term)),
  )
}

function compare(a: Order, b: Order, field: OrdersQuery['sort']): number {
  const left = a[field]
  const right = b[field]
  if (typeof left === 'number' && typeof right === 'number') return left - right
  return String(left).localeCompare(String(right))
}

export function sortOrders(orders: Order[], sort: OrdersQuery['sort'], dir: OrdersQuery['dir']): Order[] {
  const sign = dir === 'asc' ? 1 : -1
  // Tie-break on id so pagination is deterministic across requests.
  return [...orders].sort((a, b) => sign * compare(a, b, sort) || a.id.localeCompare(b.id))
}

export function queryOrders(orders: Order[], query: OrdersQuery): OrdersPage {
  const filtered = sortOrders(filterOrders(orders, query), query.sort, query.dir)
  const start = (query.page - 1) * query.size
  return {
    items: filtered.slice(start, start + query.size),
    total: filtered.length,
    page: query.page,
    size: query.size,
    pageCount: Math.max(1, Math.ceil(filtered.length / query.size)),
  }
}

export function summarizeOrders(orders: Order[], query: OrdersQuery): OrdersSummary {
  const byStatus = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as OrdersSummary['byStatus']
  let revenue = 0
  const filtered = filterOrders(orders, query)
  for (const order of filtered) {
    byStatus[order.status] += 1
    if (order.status !== 'cancelled' && order.status !== 'refunded') revenue += order.amount
  }
  return { count: filtered.length, revenue, byStatus }
}
