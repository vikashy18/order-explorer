import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'
import { ApiError, fetchOrders, fetchSummary } from '../api/client'
import type { Order, OrdersPage, OrdersQuery } from '../types'
import { clearCaches } from './ExplorerPage'

vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  fetchOrders: vi.fn(),
  fetchSummary: vi.fn(),
}))

interface PendingRequest {
  query: OrdersQuery
  resolve: (page: OrdersPage) => void
  reject: (error: unknown) => void
}

let pending: PendingRequest[] = []

function order(id: number, customer: string): Order {
  return {
    id: `ORD-${String(id).padStart(5, '0')}`,
    customer,
    email: `${customer.toLowerCase().replace(' ', '.')}@example.com`,
    status: 'paid',
    channel: 'web',
    country: 'IN',
    amount: 1000,
    items: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
  }
}

function pageOf(...items: Order[]): OrdersPage {
  return { items, total: items.length, page: 1, size: 100, pageCount: 1 }
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>,
  )
}

const ordersTable = () => screen.getByRole('table', { name: 'Orders' })

beforeEach(() => {
  clearCaches()
  pending = []
  vi.mocked(fetchOrders).mockReset().mockImplementation(
    (query) =>
      new Promise<OrdersPage>((resolve, reject) => {
        pending.push({ query, resolve, reject })
      }),
  )
  vi.mocked(fetchSummary).mockReset().mockResolvedValue({
    count: 1,
    revenue: 1000,
    byStatus: { pending: 0, paid: 1, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 },
  })
})

describe('ExplorerPage', () => {
  it('ignores a slow response for an older filter that arrives after the newer one', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await act(async () => pending[0]!.resolve(pageOf(order(1, 'Initial Row'))))
    expect(within(ordersTable()).getByText('Initial Row')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Paid' }))
    await user.click(screen.getByRole('checkbox', { name: 'Shipped' }))
    const [, slowOlder, fastNewer] = pending
    expect(slowOlder!.query.status).toEqual(['paid'])
    expect(fastNewer!.query.status).toEqual(['paid', 'shipped'])

    await act(async () => fastNewer!.resolve(pageOf(order(3, 'Newest Row'))))
    await act(async () => slowOlder!.resolve(pageOf(order(2, 'Stale Row'))))

    expect(within(ordersTable()).getByText('Newest Row')).toBeInTheDocument()
    expect(screen.queryByText('Stale Row')).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent('1 orders found')
  })

  it('debounces typing into a single search request', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await act(async () => pending[0]!.resolve(pageOf(order(1, 'Initial Row'))))

    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'asha')
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(pending.map((p) => p.query.q)).toEqual(['', 'asha'])
  })

  it('hides old rows on failure, announces the error, and recovers on retry', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await act(async () => pending[0]!.resolve(pageOf(order(1, 'Initial Row'))))

    await user.click(screen.getByRole('checkbox', { name: 'Paid' }))
    await act(async () => pending[1]!.reject(new ApiError('The server failed to respond (HTTP 500).', 'server', 500)))

    expect(screen.getByRole('alert')).toHaveTextContent('orders could not be loaded')
    expect(screen.queryByText('Initial Row')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(pending).toHaveLength(3)
    expect(pending[2]!.query.status).toEqual(['paid'])
    await act(async () => pending[2]!.resolve(pageOf(order(4, 'Recovered Row'))))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(within(ordersTable()).getByText('Recovered Row')).toBeInTheDocument()
  })

  it('restores the full view from a shared URL', async () => {
    renderAt('/?q=asha&status=paid,shipped&sort=amount&dir=asc&page=3&size=50')

    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('asha')
    expect(screen.getByRole('checkbox', { name: 'Paid' })).toBeChecked()
    expect(screen.getByRole('columnheader', { name: /amount/i })).toHaveAttribute('aria-sort', 'ascending')
    expect(pending[0]!.query).toMatchObject({ q: 'asha', status: ['paid', 'shipped'], sort: 'amount', dir: 'asc', page: 3, size: 50 })
  })
})
