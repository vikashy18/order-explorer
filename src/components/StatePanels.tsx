import type { ReactNode } from 'react'
import { ApiError } from '../api/client'

export function errorTitle(error: Error | undefined): string {
  if (error instanceof ApiError && error.kind === 'network') return 'Connection problem'
  return 'Something went wrong'
}

export function ErrorPanel({
  title,
  error,
  onRetry,
  compact = false,
}: {
  title: string
  error: Error | undefined
  onRetry: () => void
  compact?: boolean
}) {
  return (
    <div
      role="alert"
      className={`flex flex-wrap items-center gap-3 rounded-md border border-rose-200 bg-rose-50 text-rose-900 ${
        compact ? 'px-3 py-2 text-sm' : 'm-4 p-4'
      }`}
    >
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm">{error?.message ?? 'Unknown error.'}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
      >
        Retry
      </button>
    </div>
  )
}

export function EmptyPanel({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {children}
    </div>
  )
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-11 items-center gap-4 border-b border-slate-100 px-3">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          <div className="h-3 flex-1 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          <div className="h-3 w-16 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-200 motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  )
}
