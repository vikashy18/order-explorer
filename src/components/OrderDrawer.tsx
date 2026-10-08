import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { ApiError, fetchOrder } from '../api/client'
import { QueryCache } from '../lib/queryCache'
import { useLatestQuery } from '../lib/useLatestQuery'
import { capitalize, formatCurrency, formatDateTime } from '../lib/format'
import type { OrderDetail } from '../types'
import { ErrorPanel, errorTitle } from './StatePanels'
import { StatusBadge } from './StatusBadge'

const detailCache = new QueryCache<OrderDetail>({ maxEntries: 100, ttlMs: 5 * 60_000 })

export function OrderDrawer() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const result = useLatestQuery(orderId, (signal) => fetchOrder(orderId, signal), detailCache)

  const close = useCallback(() => {
    void navigate({ pathname: '/', search: location.search })
  }, [navigate, location.search])

  const orderIdRef = useRef(orderId)
  useEffect(() => {
    orderIdRef.current = orderId
  }, [orderId])

  // Layout effect so the cleanup runs while the dialog is still in the DOM;
  // otherwise the browser's focus fixup for the removed dialog wins.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || typeof dialog.showModal !== 'function') return
    if (!dialog.open) dialog.showModal()
    headingRef.current?.focus()
    return () => {
      dialog.close()
      // Runs however the drawer closes (button, Esc, Back). The list stayed
      // mounted underneath, so the row is still there to receive focus.
      document.querySelector<HTMLElement>(`[data-order-id="${CSS.escape(orderIdRef.current)}"]`)?.focus()
    }
  }, [])

  useEffect(() => {
    headingRef.current?.focus()
  }, [orderId])

  const order = result.data

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="order-drawer-title"
      aria-busy={result.status === 'loading'}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      onClick={(e) => {
        if (e.target === dialogRef.current) close()
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-lg overflow-y-auto bg-white p-0 shadow-2xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 id="order-drawer-title" ref={headingRef} tabIndex={-1} className="text-lg font-semibold focus:outline-none">
          Order <span className="font-mono">{orderId}</span>
        </h2>
        <button
          type="button"
          onClick={close}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Close<span className="sr-only"> order details</span>
        </button>
      </div>

      <div className="px-6 py-5">
        {result.status === 'loading' && (
          <p className="text-slate-600" role="status">
            Loading order details…
          </p>
        )}

        {result.status === 'error' &&
          (result.error instanceof ApiError && result.error.kind === 'not-found' ? (
            <div role="alert" className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">Order not found</p>
              <p className="text-sm text-slate-600">There is no order with ID {orderId}. The link may be wrong.</p>
            </div>
          ) : (
            <ErrorPanel compact title={errorTitle(result.error)} error={result.error} onRetry={result.retry} />
          ))}

        {order && (
          <div className="space-y-6">
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <StatusBadge status={order.status} />
              </dd>
              <dt className="text-slate-500">Customer</dt>
              <dd className="font-medium">{order.customer}</dd>
              <dt className="text-slate-500">Email</dt>
              <dd>{order.email}</dd>
              <dt className="text-slate-500">Phone</dt>
              <dd>{order.phone}</dd>
              <dt className="text-slate-500">Placed</dt>
              <dd>{formatDateTime(order.createdAt)}</dd>
              <dt className="text-slate-500">Channel</dt>
              <dd>{capitalize(order.channel)}</dd>
              <dt className="text-slate-500">Ship to</dt>
              <dd>
                {order.shippingAddress} ({order.country})
              </dd>
              {order.notes && (
                <>
                  <dt className="text-slate-500">Notes</dt>
                  <dd>{order.notes}</dd>
                </>
              )}
            </dl>

            <table className="w-full text-sm">
              <caption className="mb-2 text-left font-semibold">Line items</caption>
              <thead className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th scope="col" className="py-2">Item</th>
                  <th scope="col" className="py-2">SKU</th>
                  <th scope="col" className="py-2 text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {order.lineItems.map((item, i) => (
                  <tr key={`${item.sku}-${i}`} className="border-b border-slate-100">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2 font-mono text-xs">{item.sku}</td>
                    <td className="py-2 text-right tabular-nums">{formatCurrency(item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" colSpan={2} className="py-2 text-left">Total</th>
                  <td className="py-2 text-right font-semibold tabular-nums">{formatCurrency(order.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </dialog>
  )
}
