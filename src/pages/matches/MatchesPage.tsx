import { useState, useMemo, useEffect } from 'react'
import styles from './MatchesPage.module.css'
import { countdownLabel, isClosed, toDisplayDate } from '../../lib/time'
import { MatchStatusValue, MATCH_STATUS_LABELS } from '../../lib/types'
import type { Match } from '../../lib/types'
import { getMappedMatches } from '../../lib/mappers'
import { useMatchStatuses } from '../../hooks/useMatchStatuses'
import { MatchDetailPanel } from '../../components/MatchDetailPanel'

export type MatchFilter = 'all' | 'active' | 'upcoming' | 'past'

const classifyMatch = (match: Match, now: Date) => {
  const startMs = new Date(match.matchCommenceStartDate).getTime()
  const nowMs = now.getTime()
  const endMs = startMs + 4 * 60 * 60 * 1000
  if (nowMs < startMs) return 'upcoming' as const
  if (nowMs < endMs) return 'active' as const
  return 'past' as const
}

interface MatchesPageProps {
  userId: string | null
}

export function MatchesPage({ userId }: MatchesPageProps) {
  const allMatches = useMemo(() => getMappedMatches(), [])
  const { statuses: matchStatuses } = useMatchStatuses()

  const [clockTick, setClockTick] = useState(0)
  const now = useMemo(() => new Date(), [clockTick])

  useEffect(() => {
    const id = window.setInterval(() => setClockTick((t) => t + 1), 30000)
    return () => window.clearInterval(id)
  }, [])

  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(
    allMatches[0]?.id ?? null,
  )
  const [detailActive, setDetailActive] = useState(false)

  const filteredMatches = useMemo(() => {
    if (matchFilter === 'all') return allMatches
    return allMatches.filter((m) => {
      const derived = classifyMatch(m, now)
      if (matchFilter === 'active') return derived === 'active'
      if (matchFilter === 'upcoming') return derived === 'upcoming'
      return derived === 'past'
    })
  }, [allMatches, matchFilter, now])

  // Resolve selected match — fall back to first visible if current not in list
  const selectedMatch = useMemo(() => {
    if (!selectedMatchId) return filteredMatches[0] ?? null
    return filteredMatches.find((m) => m.id === selectedMatchId) ?? filteredMatches[0] ?? null
  }, [filteredMatches, selectedMatchId])

  const getEffectiveStatus = (match: Match): number => {
    const entry = matchStatuses[match.id]
    const apiStatus = entry?.status ?? MatchStatusValue.NotStarted
    if (apiStatus === MatchStatusValue.ReadyForPicks && entry?.isDelayed) return MatchStatusValue.ReadyForPicks
    const startDate = entry?.matchCommenceStartDate ?? match.matchCommenceStartDate
    if (apiStatus === MatchStatusValue.ReadyForPicks && isClosed(startDate)) return MatchStatusValue.PicksClosed
    return apiStatus
  }

  const effectiveMatchStartDate = selectedMatch
    ? (matchStatuses[selectedMatch.id]?.matchCommenceStartDate ??
        selectedMatch.matchCommenceStartDate)
    : ''

  const apiStatus = selectedMatch
    ? (matchStatuses[selectedMatch.id]?.status ?? MatchStatusValue.NotStarted)
    : MatchStatusValue.NotStarted

  const isDelayed = selectedMatch
    ? !!(matchStatuses[selectedMatch.id]?.isDelayed)
    : false

  return (
    <section
      className={`layout-grid${detailActive && selectedMatch ? ' layout-grid--detail' : ''}`}
    >
      <article className="panel">
        <h2>Match List</h2>
        <p className="subtle">Each match has 5 questions, total 50 credits.</p>
        <div className={styles.filterRow} role="group" aria-label="Match filters">
          {(['all', 'active', 'upcoming', 'past'] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={matchFilter === f ? `${styles.filterChip} ${styles.active}` : styles.filterChip}
              onClick={() => setMatchFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : f === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
        <div className={styles.matchList}>
          {filteredMatches.length === 0 ? (
            <p className="subtle">No matches for this filter.</p>
          ) : null}
          {filteredMatches.map((match) => {
            const effectiveStartDate =
              matchStatuses[match.id]?.matchCommenceStartDate ?? match.matchCommenceStartDate
            const matchIsDelayed = !!(matchStatuses[match.id]?.isDelayed)
            const closeLabel = matchIsDelayed ? '⏸ Delayed' : countdownLabel(effectiveStartDate)
            const isActive = selectedMatch?.id === match.id
            const effectiveStatus = getEffectiveStatus(match)
            return (
              <button
                key={match.id}
                type="button"
                className={isActive ? `${styles.matchCard} ${styles.active}` : styles.matchCard}
                onClick={() => {
                  setSelectedMatchId(match.id)
                  setDetailActive(true)
                }}
              >
                <div className={styles.matchCardHead}>
                  <span>
                    {match.firstBattingTeamCode} vs {match.secondBattingTeamCode}
                  </span>
                  <span className={`match-status-chip match-status-chip--${effectiveStatus}`}>
                    {MATCH_STATUS_LABELS[effectiveStatus]}
                    {matchIsDelayed ? ' · Delayed' : ''}
                  </span>
                </div>
                <p>{match.matchName}</p>
                <small>
                  {toDisplayDate(effectiveStartDate)} | {closeLabel}
                </small>
              </button>
            )
          })}
        </div>
      </article>

      <article className="panel">
        <button
          type="button"
          className={styles.detailBackBtn}
          onClick={() => setDetailActive(false)}
        >
          ← Back to matches
        </button>
        <h2>{selectedMatch ? selectedMatch.matchName : 'Select a match'}</h2>
        {selectedMatch ? (
          <p className="subtle">
            {selectedMatch.groundName}, {selectedMatch.city} | Starts{' '}
            {toDisplayDate(
              matchStatuses[selectedMatch.id]?.matchCommenceStartDate ??
                selectedMatch.matchCommenceStartDate,
            )}
          </p>
        ) : null}

        {selectedMatch && (
          <MatchDetailPanel
            matchId={selectedMatch.id}
            effectiveStartDate={effectiveMatchStartDate}
            isDelayed={isDelayed}
            apiStatus={apiStatus}
            userId={userId}
          />
        )}
      </article>
    </section>
  )
}
