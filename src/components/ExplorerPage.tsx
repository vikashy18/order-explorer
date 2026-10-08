import { useCallback, useMemo } from 'react'
import { Outlet, useLocation } from 'react-router'
import { fetchOrders, fetchSummary } from '../api/client'
import { formatInteger } from '../lib/format'
import { QueryCache } from '../lib/queryCache'
import { filtersKey, hasActiveFilters, listKey } from '../lib/urlState'
import { useLatestQuery } from '../lib/useLatestQuery'
import { useQueryState } from '../lib/useQueryState'
import type { Order, OrdersPage, OrdersSummary, SortField } from '../types'
import { ChaosPanel } from './ChaosPanel'
import { Filters } from './Filters'
import { OrdersTable } from './OrdersTable'
import { Pagination } from './Pagination'
import { EmptyPanel, ErrorPanel, errorTitle, TableSkeleton } from './StatePanels'
import { SummaryBar } from './SummaryBar'

const NO_ROWS: Order[] = []
const primaryButton =
  'rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'

const listCache = new QueryCache<OrdersPage>()
const summaryCache = new QueryCache<OrdersSummary>()

export function clearCaches() {
  listCache.clear()
  summaryCache.clear()
}

export function ExplorerPage() {
  const { query, update, reset } = useQueryState()
  const { search } = useLocation()

  const key = listKey(query)
  const summaryKey = filtersKey(query)
  const list = useLatestQuery(key, (signal) => fetchOrders(query, signal), listCache)
  const summary = useLatestQuery(summaryKey, (signal) => fetchSummary(query, signal), summaryCache)

  const onSort = useCallback(
    (field: SortField) => {
      const dir = query.sort === field ? (query.dir === 'asc' ? 'desc' : 'asc') : field === 'createdAt' || field === 'amount' ? 'desc' : 'asc'
      update({ sort: field, dir })
    },
    [query.sort, query.dir, update],
  )

  const page = list.data
  const pageCount =
    page?.pageCount ?? (summary.data ? Math.max(1, Math.ceil(summary.data.count / query.size)) : undefined)

  const announcement = useMemo(() => {
    if (list.status === 'loading') return 'Loading orders…'
    if (list.status === 'error') return ''
    if (!page) return ''
    if (page.total === 0) return 'No orders match your search and filters.'
    if (page.items.length === 0) return `Page ${page.page} is past the last page.`
    const from = (page.page - 1) * page.size + 1
    const to = from + page.items.length - 1
    return `${formatInteger(page.total)} orders found. Showing ${formatInteger(from)} to ${formatInteger(to)}, page ${page.page} of ${page.pageCount}.`
  }, [list.status, page])

  const partialFailure = list.status === 'success' && summary.status === 'error'

  function renderPlaceholder() {
    if (list.status === 'loading') return <TableSkeleton />
    if (list.status === 'error') {
      return (
        <div className="py-8">
          <ErrorPanel title={`${errorTitle(list.error)}: orders could not be loaded`} error={list.error} onRetry={list.retry} />
          <p className="px-4 text-center text-sm text-slate-500">No results are shown because they could be out of date.</p>
        </div>
      )
    }
    if (!page) return null
    if (page.total === 0) {
      return (
        <EmptyPanel title="No orders match your search and filters">
          <p className="text-sm text-slate-600">Try a different search term or remove some filters.</p>
          <button type="button" onClick={reset} className={primaryButton}>
            Clear search and filters
          </button>
        </EmptyPanel>
      )
    }
    if (page.items.length === 0) {
      return (
        <EmptyPanel title={`Page ${formatInteger(page.page)} doesn't exist`}>
          <p className="text-sm text-slate-600">There are only {formatInteger(page.pageCount)} pages for these filters.</p>
          <button type="button" onClick={() => update({ page: page.pageCount })} className={primaryButton}>
            Go to last page
          </button>
        </EmptyPanel>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen">
      <a
        href="#results"
        className="sr-only z-50 rounded-md bg-white px-4 py-2 font-medium text-indigo-700 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to results
      </a>
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-semibold">Order Explorer</h1>
            <p className="text-xs text-slate-400">25,000 orders · server-side search, filters, sort and pagination</p>
          </div>
          <ChaosPanel />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <Filters query={query} onChange={update} onReset={reset} canReset={hasActiveFilters(query)} />

        <SummaryBar result={summary} />

        {partialFailure && (
          <p className="text-sm text-amber-800">
            The order list loaded, but the summary did not. The list below is current; only the totals are missing.
          </p>
        )}

        <section
          id="results"
          tabIndex={-1}
          aria-label="Results"
          aria-busy={list.status === 'loading'}
          className="rounded-lg border border-slate-200 bg-white shadow-sm focus:outline-none"
        >
          <OrdersTable
            rows={page?.items ?? NO_ROWS}
            firstRowNumber={(query.page - 1) * query.size + 1}
            total={page?.total ?? 0}
            query={query}
            search={search}
            onSort={onSort}
            resultKey={key}
            placeholder={renderPlaceholder()}
          />

          <Pagination
            page={query.page}
            pageCount={pageCount}
            size={query.size}
            disabled={list.status === 'error'}
            onPage={(p) => update({ page: p })}
            onSize={(size) => update({ size })}
          />
        </section>
      </main>

      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      <Outlet />
    </div>
  )
}
