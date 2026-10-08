import { useEffect, useRef, useState } from 'react'

/**
 * Local draft for a text input whose committed value lives elsewhere (the URL).
 * Typing updates the draft immediately; the commit is debounced. When the
 * committed value changes from outside (Back/Forward, "clear filters"), the
 * draft follows it.
 */
export function useCommittedInput(committed: string, onCommit: (value: string) => void, delayMs = 300) {
  const [draft, setDraft] = useState(committed)
  const [lastCommitted, setLastCommitted] = useState(committed)
  const pendingRef = useRef(false)

  if (committed !== lastCommitted) {
    setLastCommitted(committed)
    setDraft(committed)
  }

  const onCommitRef = useRef(onCommit)
  useEffect(() => {
    onCommitRef.current = onCommit
  })

  useEffect(() => {
    if (!pendingRef.current) return
    const timer = setTimeout(() => {
      pendingRef.current = false
      if (draft !== committed) onCommitRef.current(draft)
    }, delayMs)
    return () => clearTimeout(timer)
  }, [draft, committed, delayMs])

  return {
    draft,
    change(value: string) {
      pendingRef.current = true
      setDraft(value)
    },
    /** Commit immediately (e.g. on Enter) instead of waiting for the debounce. */
    flush() {
      pendingRef.current = false
      if (draft !== committed) onCommit(draft)
    },
  }
}
