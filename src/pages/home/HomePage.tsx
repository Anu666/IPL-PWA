import { useEffect, useMemo, useState } from 'react'
import { countdownLabel, isClosed, toDisplayDate } from '../../lib/time'
import { MatchStatusValue } from '../../lib/types'
import type { Match } from '../../lib/types'
import { getMappedMatches } from '../../lib/mappers'
import { useMatchStatuses } from '../../hooks/useMatchStatuses'
import { MatchDetailPanel } from '../../components/MatchDetailPanel'

// ── Group definitions ─────────────────────────────────────────────────────────
type GroupKey = 'ready' | 'inProgress' | 'completed'

const GROUP_LABELS: Record<GroupKey, string> = {
  ready: 'Ready for Picks',
  inProgress: 'In Progress',
  completed: 'Completed',
}

const IN_PROGRESS_STATUSES = new Set<number>([
  MatchStatusValue.PicksClosed,
  MatchStatusValue.BetsUpdated,
  MatchStatusValue.MatchCompleted,
  MatchStatusValue.BetsSettled,
  MatchStatusValue.TransactionsSettled,
])

const getGroup = (status: number): GroupKey | null => {
  if (status === MatchStatusValue.ReadyForPicks) return 'ready'
  if (IN_PROGRESS_STATUSES.has(status)) return 'inProgress'
  if (status === MatchStatusValue.Done) return 'completed'
  return null
}

const isSameIstDate = (isoLike: string, now: Date) => {
  const targetDate = new Date(isoLike).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
  const nowDate = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  return targetDate === nowDate
}

interface HomePageProps {
  userId: string | null
}

export function HomePage({ userId }: HomePageProps) {
  const matches = useMemo(() => getMappedMatches(), [])
  const { statuses: matchStatuses } = useMatchStatuses()

  const [clockTick, setClockTick] = useState(0)
  const now = useMemo(() => new Date(), [clockTick])

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((t) => t + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  const todayMatches = useMemo(() => {
    return matches
      .filter((m) => isSameIstDate(m.matchCommenceStartDate, now))
      .sort(
        (a, b) =>
          new Date(a.matchCommenceStartDate).getTime() -
          new Date(b.matchCommenceStartDate).getTime(),
      )
  }, [matches, now])

  const homeMatches = useMemo(() => {
    if (todayMatches.length > 0) return todayMatches
    const nearestUpcoming = [...matches]
      .filter((m) => new Date(m.matchCommenceStartDate).getTime() > now.getTime())
      .sort(
        (a, b) =>
          new Date(a.matchCommenceStartDate).getTime() -
          new Date(b.matchCommenceStartDate).getTime(),
      )[0]
    return nearestUpcoming ? [nearestUpcoming] : []
  }, [matches, now, todayMatches])

  const homeMatchPool = useMemo(() => {
    const nonStarted = matches
      .filter(
        (m) =>
          (matchStatuses[m.id]?.status ?? MatchStatusValue.NotStarted) !==
          MatchStatusValue.NotStarted,
      )
      .sort(
        (a, b) =>
          new Date(a.matchCommenceStartDate).getTime() -
          new Date(b.matchCommenceStartDate).getTime(),
      )
    if (nonStarted.length > 0) return nonStarted
    return homeMatches
  }, [matches, matchStatuses, homeMatches])

  const [selectedHomeMatchId, setSelectedHomeMatchId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | null>(null)

  // Per-match effective status (for group logic)
  const getEffectiveStatusForMatch = (m: Match): number => {
    const entry = matchStatuses[m.id]
    const s = entry?.status ?? MatchStatusValue.NotStarted
    if (s === MatchStatusValue.ReadyForPicks && entry?.isDelayed) return MatchStatusValue.ReadyForPicks
    const startDate = entry?.matchCommenceStartDate ?? m.matchCommenceStartDate
    if (s === MatchStatusValue.ReadyForPicks && isClosed(startDate)) return MatchStatusValue.PicksClosed
    return s
  }

  const groupCounts = useMemo(() => {
    const counts: Partial<Record<GroupKey, number>> = {}
    for (const m of homeMatchPool) {
      const eff = getEffectiveStatusForMatch(m)
      const g = getGroup(eff)
      if (g) counts[g] = (counts[g] ?? 0) + 1
    }
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMatchPool, matchStatuses])

  const activeGroups = useMemo<GroupKey[]>(() => {
    const all: GroupKey[] = ['ready', 'inProgress', 'completed']
    return all.filter((g) => (groupCounts[g] ?? 0) > 0)
  }, [groupCounts])

  // Keep selectedGroup in sync: prefer 'inProgress', fall back to first active group
  useEffect(() => {
    if (activeGroups.length === 0) return
    if (!selectedGroup || !activeGroups.includes(selectedGroup)) {
      setSelectedGroup(activeGroups.includes('inProgress') ? 'inProgress' : activeGroups[0])
    }
  }, [activeGroups, selectedGroup])

  const visibleMatches = useMemo(() => {
    if (!selectedGroup) return []
    const filtered = homeMatchPool.filter(
      (m) => getGroup(getEffectiveStatusForMatch(m)) === selectedGroup,
    )
    if (selectedGroup === 'completed') {
      return filtered.sort(
        (a, b) =>
          new Date(b.matchCommenceStartDate).getTime() -
          new Date(a.matchCommenceStartDate).getTime(),
      )
    }
    return filtered.sort(
      (a, b) =>
        new Date(a.matchCommenceStartDate).getTime() -
        new Date(b.matchCommenceStartDate).getTime(),
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMatchPool, matchStatuses, selectedGroup])

  // Ensure selectedHomeMatchId stays in the visible list
  useEffect(() => {
    if (visibleMatches.length > 0 && !visibleMatches.some((m) => m.id === selectedHomeMatchId)) {
      setSelectedHomeMatchId(visibleMatches[0].id)
    }
  }, [visibleMatches, selectedHomeMatchId])

  const selectedHomeMatch = useMemo(
    () => homeMatchPool.find((m) => m.id === selectedHomeMatchId) ?? null,
    [homeMatchPool, selectedHomeMatchId],
  )

  const effectiveMatchStartDate = selectedHomeMatch
    ? (matchStatuses[selectedHomeMatch.id]?.matchCommenceStartDate ??
        selectedHomeMatch.matchCommenceStartDate)
    : ''

  const apiStatus = selectedHomeMatch
    ? (matchStatuses[selectedHomeMatch.id]?.status ?? MatchStatusValue.NotStarted)
    : MatchStatusValue.NotStarted

  const isDelayed = selectedHomeMatch
    ? !!(matchStatuses[selectedHomeMatch.id]?.isDelayed)
    : false

  return (
    <div className="home-wrapper">
      {/* Group filter chips */}
      {activeGroups.length > 0 && (
        <div className="home-status-filters">
          {activeGroups.map((g) => (
            <button
              key={g}
              type="button"
              className={`home-status-filter-chip home-group-chip${selectedGroup === g ? ' active' : ''}`}
              onClick={() => setSelectedGroup(g)}
            >
              {GROUP_LABELS[g]}
              <span className="home-status-filter-count">{groupCounts[g]}</span>
            </button>
          ))}
        </div>
      )}

      <section className="panel home-panel">
        {/* Match switcher chips — when multiple matches in group */}
        {visibleMatches.length > 1 && (
          <div className="home-match-chips">
            {visibleMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`home-match-chip${m.id === selectedHomeMatchId ? ' active' : ''}`}
                onClick={() => setSelectedHomeMatchId(m.id)}
              >
                <span className="home-match-chip-teams">
                  {m.firstBattingTeamCode} vs {m.secondBattingTeamCode}
                </span>
              </button>
            ))}
          </div>
        )}

        {selectedHomeMatch ? (
          <>
            <div className="home-match-header">
              <div className="home-match-teams">
                <span className="home-team">{selectedHomeMatch.firstBattingTeamCode}</span>
                <span className="home-vs">vs</span>
                <span className="home-team">{selectedHomeMatch.secondBattingTeamCode}</span>
              </div>
              <p className="subtle home-match-name">{selectedHomeMatch.matchName}</p>
              <p className="subtle">{selectedHomeMatch.groundName}, {selectedHomeMatch.city}</p>
              <p className="subtle">
                {toDisplayDate(effectiveMatchStartDate)}&ensp;·&ensp;
                {isDelayed
                  ? <strong style={{ color: '#f59e0b' }}>⏸ Delayed</strong>
                  : <strong style={{ color: 'var(--sun)' }}>{countdownLabel(effectiveMatchStartDate)}</strong>
                }
              </p>
            </div>

            <MatchDetailPanel
              matchId={selectedHomeMatch.id}
              effectiveStartDate={effectiveMatchStartDate}
              isDelayed={isDelayed}
              apiStatus={apiStatus}
              userId={userId}
            />
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h2 style={{ margin: '0 0 0.5rem' }}>No Upcoming Match</h2>
            <p className="subtle">Check back when the next match is scheduled.</p>
          </div>
        )}
      </section>
    </div>
  )
}
