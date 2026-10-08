import { setupWorker } from 'msw/browser'
import { loadChaos } from './chaos'
import { createHandlers } from './handlers'

export const worker = setupWorker(...createHandlers(loadChaos))
