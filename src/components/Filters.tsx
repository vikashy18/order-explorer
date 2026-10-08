import { useId } from 'react'
import { CHANNELS, COUNTRIES, ORDER_STATUSES, type OrdersQuery, type OrderStatus } from '../types'
import { capitalize } from '../lib/format'
import { useCommittedInput } from '../lib/useCommittedInput'
import type { UpdateOptions } from '../lib/useQueryState'

interface Props {
  query: OrdersQuery
  onChange: (patch: Partial<OrdersQuery>, options?: UpdateOptions) => void
  onReset: () => void
  canReset: boolean
}

const fieldClass =
  'block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus-visible:border-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600'

const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600'

function SearchBox({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const input = useCommittedInput(value, onCommit)
  const hintId = useId()
  return (
    <div className="min-w-56 flex-[2]">
      <label htmlFor="order-search" className={labelClass}>
        Search
      </label>
      <input
        id="order-search"
        type="search"
        value={input.draft}
        onChange={(e) => input.change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') input.flush()
        }}
        placeholder="Order ID, customer or email"
        autoComplete="off"
        spellCheck={false}
        maxLength={100}
        aria-describedby={hintId}
        className={fieldClass}
      />
      <p id={hintId} className="sr-only">
        Results update as you type.
      </p>
    </div>
  )
}

function AmountInput({
  id,
  label,
  value,
  onCommit,
  invalid,
  describedBy,
}: {
  id: string
  label: string
  value: number | null
  onCommit: (value: number | null) => void
  invalid: boolean
  describedBy?: string
}) {
  const input = useCommittedInput(value === null ? '' : String(value), (raw) => {
    const parsed = raw.trim() === '' ? null : Number(raw)
    if (parsed === null || (Number.isFinite(parsed) && parsed >= 0)) onCommit(parsed)
  })
  return (
    <div className="w-32">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step={100}
        value={input.draft}
        onChange={(e) => input.change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') input.flush()
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={fieldClass}
      />
    </div>
  )
}

export function Filters({ query, onChange, onReset, canReset }: Props) {
  const rangeErrorId = useId()
  const rangeInvalid = query.min !== null && query.max !== null && query.min > query.max

  function toggleStatus(status: OrderStatus, checked: boolean) {
    const next = new Set(query.status)
    if (checked) next.add(status)
    else next.delete(status)
    onChange({ status: ORDER_STATUSES.filter((s) => next.has(s)) })
  }

  return (
    <section aria-label="Search and filters" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <SearchBox value={query.q} onCommit={(q) => onChange({ q }, { typing: true })} />

        <div className="w-40">
          <label htmlFor="filter-channel" className={labelClass}>
            Channel
          </label>
          <select
            id="filter-channel"
            value={query.channel}
            onChange={(e) => onChange({ channel: e.target.value as OrdersQuery['channel'] })}
            className={fieldClass}
          >
            <option value="">All channels</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {capitalize(c)}
              </option>
            ))}
          </select>
        </div>

        <div className="w-36">
          <label htmlFor="filter-country" className={labelClass}>
            Country
          </label>
          <select
            id="filter-country"
            value={query.country}
            onChange={(e) => onChange({ country: e.target.value as OrdersQuery['country'] })}
            className={fieldClass}
          >
            <option value="">All countries</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <AmountInput
          id="filter-min"
          label="Min ₹"
          value={query.min}
          onCommit={(min) => onChange({ min }, { typing: true })}
          invalid={rangeInvalid}
          describedBy={rangeInvalid ? rangeErrorId : undefined}
        />
        <AmountInput
          id="filter-max"
          label="Max ₹"
          value={query.max}
          onCommit={(max) => onChange({ max }, { typing: true })}
          invalid={rangeInvalid}
          describedBy={rangeInvalid ? rangeErrorId : undefined}
        />

        <button
          type="button"
          onClick={onReset}
          disabled={!canReset}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear all
        </button>
      </div>

      {rangeInvalid && (
        <p id={rangeErrorId} className="mt-2 text-sm text-amber-800">
          Min amount is greater than max amount, so nothing can match.
        </p>
      )}

      <fieldset className="mt-4">
        <legend className={labelClass}>Status</legend>
        <div className="flex flex-wrap gap-2">
          {ORDER_STATUSES.map((status) => {
            const checked = query.status.includes(status)
            return (
              <label
                key={status}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-indigo-600 ${
                  checked ? 'border-indigo-600 bg-indigo-50 text-indigo-900' : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleStatus(status, e.target.checked)}
                  className="h-4 w-4 accent-indigo-600"
                />
                {capitalize(status)}
              </label>
            )
          })}
        </div>
      </fieldset>
    </section>
  )
}
