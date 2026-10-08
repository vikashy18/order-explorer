import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { QueryCache } from './queryCache'
import { useLatestQuery } from './useLatestQuery'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
  signal?: AbortSignal
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A fetcher that records each request and lets the test settle them in any order. */
function controllableFetcher<T>() {
  const calls = new Map<string, Deferred<T>>()
  const fetcherFor = (key: string) => (signal: AbortSignal) => {
    const d = deferred<T>()
    d.signal = signal
    calls.set(key, d)
    return d.promise
  }
  return { calls, fetcherFor }
}

describe('useLatestQuery', () => {
  it('never lets a slow earlier response overwrite a newer one', async () => {
    const { calls, fetcherFor } = controllableFetcher<string>()
    const { result, rerender } = renderHook(({ k }) => useLatestQuery(k, fetcherFor(k)), {
      initialProps: { k: 'q=lap' },
    })
    rerender({ k: 'q=laptop' })

    // Newer request resolves first...
    await act(async () => calls.get('q=laptop')!.resolve('laptop results'))
    expect(result.current).toMatchObject({ status: 'success', data: 'laptop results' })

    // ...then the superseded one finally arrives. It must be ignored.
    await act(async () => calls.get('q=lap')!.resolve('lap results'))
    expect(result.current.data).toBe('laptop results')
    expect(calls.get('q=lap')!.signal!.aborted).toBe(true)
  })

  it('reports loading, not the previous key’s data, while a new key is in flight', async () => {
    const { calls, fetcherFor } = controllableFetcher<string>()
    const { result, rerender } = renderHook(({ k }) => useLatestQuery(k, fetcherFor(k)), {
      initialProps: { k: 'page=1' },
    })
    await act(async () => calls.get('page=1')!.resolve('page 1'))
    expect(result.current.data).toBe('page 1')

    rerender({ k: 'page=2' })
    expect(result.current).toMatchObject({ status: 'loading', data: undefined })
  })

  it('drops old data on failure and recovers on retry', async () => {
    let attempt = 0
    const results = [Promise.resolve('first'), Promise.reject(new Error('HTTP 500')), Promise.resolve('second')]
    results[1]!.catch(() => {})
    const fetcher = () => results[attempt++]!
    const { result, rerender } = renderHook(({ k }) => useLatestQuery(k, fetcher), { initialProps: { k: 'a' } })
    await act(async () => {})
    expect(result.current.data).toBe('first')

    rerender({ k: 'b' })
    await act(async () => {})
    expect(result.current).toMatchObject({ status: 'error', data: undefined })
    expect(result.current.error?.message).toBe('HTTP 500')

    await act(async () => result.current.retry())
    expect(result.current).toMatchObject({ status: 'success', data: 'second', error: undefined })
  })

  it('serves a previously seen key from cache without refetching (back/forward)', async () => {
    const cache = new QueryCache<string>()
    let requests = 0
    const fetcher = (key: string) => () => {
      requests++
      return Promise.resolve(`data for ${key}`)
    }
    const { result, rerender } = renderHook(({ k }) => useLatestQuery(k, fetcher(k), cache), {
      initialProps: { k: 'a' },
    })
    await act(async () => {})
    rerender({ k: 'b' })
    await act(async () => {})
    expect(requests).toBe(2)

    rerender({ k: 'a' })
    // Synchronously correct on the very first render for the new key.
    expect(result.current).toMatchObject({ status: 'success', data: 'data for a' })
    await act(async () => {})
    expect(requests).toBe(2)
  })
})
