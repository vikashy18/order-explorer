import { ORDER_STATUSES, type OrdersSummary } from '../types'
import { capitalize, formatCompactCurrency, formatInteger } from '../lib/format'
import type { QueryResult } from '../lib/useLatestQuery'
import { ErrorPanel } from './StatePanels'

export function SummaryBar({ result }: { result: QueryResult<OrdersSummary> }) {
  if (result.status === 'error') {
    return <ErrorPanel compact title="Summary unavailable" error={result.error} onRetry={result.retry} />
  }

  const summary = result.data
  return (
    <section
      aria-label="Summary of matching orders"
      aria-busy={result.status === 'loading'}
      className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-700"
    >
      {summary ? (
        <>
          <span>
            <strong className="text-slate-900">{formatInteger(summary.count)}</strong> matching orders
          </span>
          <span>
            <strong className="text-slate-900">{formatCompactCurrency(summary.revenue)}</strong> net revenue
          </span>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Orders by status">
            {ORDER_STATUSES.map((status) => (
              <li key={status}>
                {capitalize(status)}: <span className="tabular-nums">{formatInteger(summary.byStatus[status])}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <span className="flex items-center gap-2 text-slate-500">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 motion-reduce:animate-none" aria-hidden="true" />
          Calculating summary…
        </span>
      )}
    </section>
  )
}
