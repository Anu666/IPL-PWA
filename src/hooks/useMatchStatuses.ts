import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'

export interface MatchStatusEntry {
  status: number
  matchCommenceStartDate?: string | null
  isDelayed?: boolean | null
}

export function useMatchStatuses() {
  const [statuses, setStatuses] = useState<Record<string, MatchStatusEntry>>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const allStatuses = await api.matchStatuses.getAll()
      const map: Record<string, MatchStatusEntry> = {}
      for (const s of allStatuses) {
        map[s.matchId] = {
          status: s.status,
          matchCommenceStartDate: s.matchCommenceStartDate,
          isDelayed: s.isDelayed,
        }
      }
      setStatuses(map)
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { statuses, loading, refresh }
}
