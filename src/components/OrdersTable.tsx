import { memo, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Order, OrdersQuery, SortField } from '../types'
import { formatCurrency, formatDate } from '../lib/format'
import { StatusBadge } from './StatusBadge'

const ROW_HEIGHT = 44

const COLUMNS: { field: SortField; label: string; className: string; numeric?: boolean }[] = [
  { field: 'id', label: 'Order', className: 'w-32' },
  { field: 'customer', label: 'Customer', className: 'min-w-48' },
  { field: 'status', label: 'Status', className: 'w-32' },
  { field: 'createdAt', label: 'Date', className: 'w-36' },
  { field: 'items', label: 'Items', className: 'w-20', numeric: true },
  { field: 'amount', label: 'Amount', className: 'w-36', numeric: true },
]

interface Props {
  rows: Order[]
  /** 1-based index of the first row in the full result set, for aria-rowindex. */
  firstRowNumber: number
  total: number
  query: OrdersQuery
  search: string
  onSort: (field: SortField) => void
  /** Changes whenever the result set changes; resets scroll and keyboard focus. */
  resultKey: string
  /** Rendered in place of rows (loading, empty, error) so the header and its focus survive. */
  placeholder?: ReactNode
}

const Row = memo(function Row({
  order,
  index,
  ariaRowIndex,
  isActive,
  href,
  onFocusRow,
}: {
  order: Order
  index: number
  ariaRowIndex: number
  isActive: boolean
  href: string
  onFocusRow: (index: number) => void
}) {
  const navigate = useNavigate()
  return (
    <tr
      aria-rowindex={ariaRowIndex}
      style={{ height: ROW_HEIGHT }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('a')) return
        void navigate(href)
      }}
      className="cursor-pointer border-b border-slate-100 hover:bg-indigo-50/60 has-focus-visible:bg-indigo-50"
    >
      <td className="px-3 font-mono text-xs">
        <Link
          to={href}
          data-order-id={order.id}
          tabIndex={isActive ? 0 : -1}
          onFocus={() => onFocusRow(index)}
          className="rounded text-indigo-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          {order.id}
        </Link>
      </td>
      <td className="truncate px-3">
        <span className="font-medium">{order.customer}</span>
        <span className="ml-2 hidden text-xs text-slate-500 lg:inline">{order.email}</span>
      </td>
      <td className="px-3">
        <StatusBadge status={order.status} />
      </td>
      <td className="px-3 whitespace-nowrap text-slate-600">{formatDate(order.createdAt)}</td>
      <td className="px-3 text-right tabular-nums">{order.items}</td>
      <td className="px-3 text-right tabular-nums">{formatCurrency(order.amount)}</td>
    </tr>
  )
})

export function OrdersTable({ rows, firstRowNumber, total, query, search, onSort, resultKey, placeholder }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [lastResultKey, setLastResultKey] = useState(resultKey)
  const pendingFocus = useRef<number | null>(null)

  if (resultKey !== lastResultKey) {
    setLastResultKey(resultKey)
    setActiveIndex(0)
  }

  const virtualizer = useVirtualizer({
    count: placeholder ? 0 : rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
    initialRect: { width: 1024, height: 600 },
  })

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [resultKey])

  const virtualRows = virtualizer.getVirtualItems()
  // If the active row has been virtualized away, some rendered row must stay tabbable
  // or Tab would skip the table entirely.
  const tabbableIndex = virtualRows.some((v) => v.index === activeIndex) ? activeIndex : (virtualRows[0]?.index ?? 0)

  // After keyboard navigation scrolls a row into the rendered window, focus it.
  useEffect(() => {
    if (pendingFocus.current === null) return
    const order = rows[pendingFocus.current]
    const link = order && scrollRef.current?.querySelector<HTMLElement>(`[data-order-id="${order.id}"]`)
    if (link) {
      link.focus()
      pendingFocus.current = null
    }
  })

  function moveTo(index: number) {
    const clamped = Math.max(0, Math.min(rows.length - 1, index))
    setActiveIndex(clamped)
    pendingFocus.current = clamped
    virtualizer.scrollToIndex(clamped, { align: 'auto' })
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableSectionElement>) {
    const pageStep = Math.max(1, Math.floor((scrollRef.current?.clientHeight ?? 400) / ROW_HEIGHT) - 1)
    const keyMoves: Record<string, number> = {
      ArrowDown: activeIndex + 1,
      ArrowUp: activeIndex - 1,
      PageDown: activeIndex + pageStep,
      PageUp: activeIndex - pageStep,
      Home: 0,
      End: rows.length - 1,
    }
    const target = keyMoves[e.key]
    if (target === undefined) return
    e.preventDefault()
    moveTo(target)
  }

  const paddingTop = virtualRows[0]?.start ?? 0
  const paddingBottom = virtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0)

  return (
    <div ref={scrollRef} className="relative h-[60vh] min-h-80 overflow-auto rounded-b-lg">
      <table
        className="w-full min-w-[760px] table-fixed border-collapse text-sm"
        aria-label="Orders"
        aria-rowcount={total + 1}
        aria-describedby="table-keyboard-help"
      >
        <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
          <tr aria-rowindex={1}>
            {COLUMNS.map((col) => {
              const sorted = query.sort === col.field
              const ariaSort = sorted ? (query.dir === 'asc' ? 'ascending' : 'descending') : 'none'
              return (
                <th key={col.field} scope="col" aria-sort={ariaSort} className={`${col.className} p-0`}>
                  <button
                    type="button"
                    onClick={() => onSort(col.field)}
                    className={`flex w-full items-center gap-1 px-3 py-3 font-semibold uppercase hover:bg-slate-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 ${
                      col.numeric ? 'justify-end' : ''
                    }`}
                  >
                    {col.label}
                    <span aria-hidden="true" className={sorted ? 'text-indigo-700' : 'text-slate-400'}>
                      {sorted ? (query.dir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody onKeyDown={onKeyDown}>
          {placeholder && (
            <tr>
              <td colSpan={COLUMNS.length} className="p-0">
                {placeholder}
              </td>
            </tr>
          )}
          {paddingTop > 0 && (
            <tr aria-hidden="true">
              <td colSpan={COLUMNS.length} style={{ height: paddingTop, padding: 0 }} />
            </tr>
          )}
          {virtualRows.map((virtualRow) => {
            const order = rows[virtualRow.index]!
            return (
              <Row
                key={order.id}
                order={order}
                index={virtualRow.index}
                ariaRowIndex={firstRowNumber + virtualRow.index + 1}
                isActive={virtualRow.index === tabbableIndex}
                href={`/orders/${order.id}${search}`}
                onFocusRow={setActiveIndex}
              />
            )
          })}
          {paddingBottom > 0 && (
            <tr aria-hidden="true">
              <td colSpan={COLUMNS.length} style={{ height: paddingBottom, padding: 0 }} />
            </tr>
          )}
        </tbody>
      </table>
      <p id="table-keyboard-help" className="sr-only">
        Use the arrow keys, Page Up, Page Down, Home and End to move between orders. Press Enter to open an order.
      </p>
    </div>
  )
}