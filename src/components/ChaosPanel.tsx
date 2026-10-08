import { useState } from 'react'
import { CHAOS_PRESETS, loadChaos, saveChaos, type ChaosConfig, type LatencyPreset } from '../mocks/chaos'

const LATENCY_LABELS: Record<LatencyPreset, string> = {
  fast: 'Fast (0–50 ms)',
  realistic: 'Realistic (200 ms–3 s)',
  slow: 'Slow (2–6 s)',
}

function currentLatencyPreset(config: ChaosConfig): LatencyPreset {
  const entry = Object.entries(CHAOS_PRESETS.latency).find(
    ([, p]) => p.minLatencyMs === config.minLatencyMs && p.maxLatencyMs === config.maxLatencyMs,
  )
  return (entry?.[0] as LatencyPreset | undefined) ?? 'realistic'
}

/** Demo-only controls for the mock API. Settings persist in localStorage. */
export function ChaosPanel() {
  const [config, setConfig] = useState(loadChaos)

  function update(next: ChaosConfig) {
    setConfig(next)
    saveChaos(next)
  }

  const selectClass =
    'rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-300'

  return (
    <details className="relative text-sm">
      <summary className="cursor-pointer rounded-md px-3 py-1.5 text-slate-200 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">
        Mock API: {Math.round(config.failureRate * 100)}% failures, {LATENCY_LABELS[currentLatencyPreset(config)].split(' ')[0]}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 space-y-3 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="chaos-latency" className="text-slate-300">
            Latency
          </label>
          <select
            id="chaos-latency"
            className={selectClass}
            value={currentLatencyPreset(config)}
            onChange={(e) => update({ ...config, ...CHAOS_PRESETS.latency[e.target.value as LatencyPreset] })}
          >
            {(Object.keys(CHAOS_PRESETS.latency) as LatencyPreset[]).map((key) => (
              <option key={key} value={key}>
                {LATENCY_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="chaos-failure" className="text-slate-300">
            Failure rate
          </label>
          <select
            id="chaos-failure"
            className={selectClass}
            value={config.failureRate}
            onChange={(e) => update({ ...config, failureRate: Number(e.target.value) })}
          >
            {CHAOS_PRESETS.failureRate.map((rate) => (
              <option key={rate} value={rate}>
                {Math.round(rate * 100)}%
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-400">Applies to the next request. The defaults match the assignment brief.</p>
      </div>
    </details>
  )
}
