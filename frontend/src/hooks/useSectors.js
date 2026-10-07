import { useEffect, useMemo, useState } from 'react'
import { getSectors } from '../services/marketData.js'

const POLL_WHILE_BUILDING_MS = 8000
const REFRESH_MS = 10 * 60000

// Shared across pages so switching between scanner and analyzer is instant.
let cached = null
let cachedAt = 0

// Loads the sector list; keeps polling while the backend is still building
// the sector indices. Returns { data, bySlug, error }.
export function useSectors() {
  const [state, setState] = useState(() => ({ data: cached, error: null }))

  useEffect(() => {
    let timer = null
    let cancelled = false

    async function load() {
      try {
        const data = await getSectors()
        if (cancelled) return
        cached = data
        cachedAt = Date.now()
        setState({ data, error: null })
        if (data.building) timer = setTimeout(load, POLL_WHILE_BUILDING_MS)
      } catch (error) {
        if (!cancelled) setState((s) => ({ data: s.data, error: error.message }))
      }
    }

    if (!cached || cached.building || Date.now() - cachedAt > REFRESH_MS) load()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  const bySlug = useMemo(() => new Map((state.data?.sectors ?? []).map((s) => [s.slug, s])), [state.data])
  return { data: state.data, bySlug, error: state.error }
}
