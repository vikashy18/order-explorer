import { PAGE_SIZES, type PageSize } from '../types'
import { formatInteger } from '../lib/format'

interface Props {
  page: number
  pageCount: number | undefined
  size: PageSize
  onPage: (page: number) => void
  onSize: (size: PageSize) => void
  disabled: boolean
}

const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40'

export function Pagination({ page, pageCount, size, onPage, onSize, disabled }: Props) {
  const last = pageCount ?? page
  const canPrev = !disabled && page > 1
  const canNext = !disabled && pageCount !== undefined && page < pageCount

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="page-size" className="text-slate-600">
          Rows per page
        </label>
        <select
          id="page-size"
          value={size}
          onChange={(e) => onSize(Number(e.target.value) as PageSize)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => onPage(1)} disabled={!canPrev} aria-label="First page">
          «
        </button>
        <button type="button" className={buttonClass} onClick={() => onPage(page - 1)} disabled={!canPrev}>
          Previous
        </button>
        <span className="px-2 text-sm tabular-nums text-slate-700">
          Page {formatInteger(page)} of {pageCount === undefined ? '…' : formatInteger(last)}
        </span>
        <button type="button" className={buttonClass} onClick={() => onPage(page + 1)} disabled={!canNext}>
          Next
        </button>
        <button type="button" className={buttonClass} onClick={() => onPage(last)} disabled={!canNext} aria-label="Last page">
          »
        </button>
      </div>
    </nav>
  )
}
