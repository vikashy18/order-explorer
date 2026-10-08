import type { OrderStatus } from '../types'
import { capitalize } from '../lib/format'

const styles: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  paid: 'bg-sky-100 text-sky-900',
  shipped: 'bg-indigo-100 text-indigo-900',
  delivered: 'bg-emerald-100 text-emerald-900',
  cancelled: 'bg-slate-200 text-slate-800',
  refunded: 'bg-rose-100 text-rose-900',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {capitalize(status)}
    </span>
  )
}
