import { delay, http, HttpResponse } from 'msw'
import { parseQuery } from '../lib/urlState'
import type { ChaosConfig } from './chaos'
import { getOrderDetail, getOrders } from './data'
import { queryOrders, summarizeOrders } from './query'

/**
 * Wraps every endpoint with random latency and random failures. Failures are
 * a mix of HTTP 500s and dropped connections so the client has to handle both.
 */
export function createHandlers(getChaos: () => ChaosConfig, random: () => number = Math.random) {
  async function injectChaos() {
    const { minLatencyMs, maxLatencyMs, failureRate } = getChaos()
    await delay(minLatencyMs + random() * (maxLatencyMs - minLatencyMs))
    if (random() < failureRate) {
      return random() < 0.7
        ? HttpResponse.json({ message: 'Simulated server error' }, { status: 500 })
        : HttpResponse.error()
    }
    return null
  }

  return [
    http.get('/api/orders/summary', async ({ request }) => {
      const failure = await injectChaos()
      if (failure) return failure
      const query = parseQuery(new URL(request.url).searchParams)
      return HttpResponse.json(summarizeOrders(getOrders(), query))
    }),

    http.get('/api/orders/:id', async ({ params }) => {
      const failure = await injectChaos()
      if (failure) return failure
      const order = getOrderDetail(String(params.id))
      if (!order) return HttpResponse.json({ message: `Order ${params.id} not found` }, { status: 404 })
      return HttpResponse.json(order)
    }),

    http.get('/api/orders', async ({ request }) => {
      const failure = await injectChaos()
      if (failure) return failure
      const query = parseQuery(new URL(request.url).searchParams)
      return HttpResponse.json(queryOrders(getOrders(), query))
    }),
  ]
}
