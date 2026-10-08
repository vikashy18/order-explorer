export interface ChaosConfig {
  minLatencyMs: number
  maxLatencyMs: number
  failureRate: number
}

export const CHAOS_PRESETS = {
  latency: {
    fast: { minLatencyMs: 0, maxLatencyMs: 50 },
    realistic: { minLatencyMs: 200, maxLatencyMs: 3000 },
    slow: { minLatencyMs: 2000, maxLatencyMs: 6000 },
  },
  failureRate: [0, 0.1, 0.5, 1],
} as const

export type LatencyPreset = keyof typeof CHAOS_PRESETS.latency

/** The assignment's required behaviour: 200 ms–3 s latency, ~1 in 10 requests fail. */
export const DEFAULT_CHAOS: ChaosConfig = { ...CHAOS_PRESETS.latency.realistic, failureRate: 0.1 }

const STORAGE_KEY = 'order-explorer:chaos'

export function loadChaos(): ChaosConfig {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ChaosConfig> | null
    return { ...DEFAULT_CHAOS, ...stored }
  } catch {
    return DEFAULT_CHAOS
  }
}

export function saveChaos(config: ChaosConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}
