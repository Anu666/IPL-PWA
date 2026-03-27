import { useEffect, useMemo, useState } from 'react'
import { countdownLabel, isClosed, toDisplayDate } from '../lib/time'
import { MatchStatusValue, MATCH_STATUS_LABELS } from '../lib/types'
import type { Match, Question } from '../lib/types'

// Statuses to show as filter chips (NotStarted excluded)
const FILTER_STATUSES = [
  MatchStatusValue.ReadyForPicks,
  MatchStatusValue.PicksClosed,
  MatchStatusValue.BetsUpdated,
  MatchStatusValue.MatchCompleted,
  MatchStatusValue.BetsSettled,
] as const

interface HomePageProps {
  match: Match | null
  homeMatches: Match[]
  selectedHomeMatchId: string | null
  questions: Question[]
  questionSelections: Record<string, number>
  saveErrors: Record<string, string>
  matchStatuses: Record<string, number>
  onSelectMatch: (matchId: string) => void
  onSaveSelection: (question: Question, selectedOptionId: number) => Promise<void>
}

export function HomePage({ match, homeMatches, selectedHomeMatchId, questions, questionSelections, saveErrors, matchStatuses, onSelectMatch, onSaveSelection }: HomePageProps) {
  const msToStart = match ? new Date(match.matchCommenceStartDate).getTime() - Date.now() : Infinity
  const isLastTenMin = msToStart > 0 && msToStart <= 10 * 60 * 1000

  // 1-second local tick so seconds stay live in the final 10 minutes and lock flip is instant
  const [, setSecondTick] = useState(0)
  useEffect(() => {
    if (!isLastTenMin) return
    const id = setInterval(() => setSecondTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isLastTenMin])

  // Build per-status counts from homeMatches
  const statusCounts = useMemo(() => {
    const counts: Partial<Record<number, number>> = {}
    for (const m of homeMatches) {
      const s = matchStatuses[m.id] ?? MatchStatusValue.NotStarted
      if (s === MatchStatusValue.NotStarted) continue
      counts[s] = (counts[s] ?? 0) + 1
    }
    return counts
  }, [homeMatches, matchStatuses])

  // Active statuses (those that have at least 1 match)
  const activeStatuses = useMemo(
    () => FILTER_STATUSES.filter((s) => (statusCounts[s] ?? 0) > 0),
    [statusCounts],
  )

  const [selectedStatus, setSelectedStatus] = useState<number>(MatchStatusValue.ReadyForPicks)

  // Keep selectedStatus in sync: if the current status has no matches, fall back to first active
  useEffect(() => {
    if (activeStatuses.length === 0) return
    if (!activeStatuses.includes(selectedStatus as typeof FILTER_STATUSES[number])) {
      setSelectedStatus(activeStatuses[0])
    }
  }, [activeStatuses, selectedStatus])

  // Matches filtered by selected status
  const visibleMatches = useMemo(
    () => homeMatches.filter((m) => (matchStatuses[m.id] ?? MatchStatusValue.NotStarted) === selectedStatus),
    [homeMatches, matchStatuses, selectedStatus],
  )

  // When visible matches change, ensure selectedHomeMatchId is in view
  useEffect(() => {
    if (visibleMatches.length > 0 && !visibleMatches.some((m) => m.id === selectedHomeMatchId)) {
      onSelectMatch(visibleMatches[0].id)
    }
  }, [visibleMatches, selectedHomeMatchId, onSelectMatch])

  const apiStatus = match ? (matchStatuses[match.id] ?? MatchStatusValue.NotStarted) : MatchStatusValue.NotStarted
  const effectiveStatus =
    apiStatus === MatchStatusValue.ReadyForPicks && match && isClosed(match.matchCommenceStartDate)
      ? MatchStatusValue.PicksClosed
      : apiStatus
  const picksOpen = effectiveStatus === MatchStatusValue.ReadyForPicks
  const questionsVisible = effectiveStatus !== MatchStatusValue.NotStarted

  return (
    <div className="home-wrapper">
      {/* Status filter chips — outside the panel */}
      {activeStatuses.length > 0 && (
        <div className="home-status-filters">
          {activeStatuses.map((s) => (
            <button
              key={s}
              type="button"
              className={`home-status-filter-chip home-status-filter-chip--${s}${selectedStatus === s ? ' active' : ''}`}
              onClick={() => setSelectedStatus(s)}
            >
              {MATCH_STATUS_LABELS[s]}
              <span className="home-status-filter-count">{statusCounts[s]}</span>
            </button>
          ))}
        </div>
      )}

      <section className="panel home-panel">
        {/* Match switcher chips inside panel — only shown when multiple visible matches */}
        {visibleMatches.length > 1 && (
          <div className="home-match-chips">
            {visibleMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`home-match-chip${m.id === selectedHomeMatchId ? ' active' : ''}`}
                onClick={() => onSelectMatch(m.id)}
              >
                <span className="home-match-chip-teams">
                  {m.firstBattingTeamCode} vs {m.secondBattingTeamCode}
                </span>
              </button>
            ))}
          </div>
        )}

        {match ? (
          <>
            <div className="home-match-header">
              <div className="home-match-teams">
                <span className="home-team">{match.firstBattingTeamCode}</span>
                <span className="home-vs">vs</span>
                <span className="home-team">{match.secondBattingTeamCode}</span>
              </div>
              <p className="subtle home-match-name">{match.matchName}</p>
              <p className="subtle">{match.groundName}, {match.city}</p>
              <p className="subtle">
                {toDisplayDate(match.matchCommenceStartDate)}&ensp;·&ensp;
                <strong style={{ color: 'var(--sun)' }}>{countdownLabel(match.matchCommenceStartDate)}</strong>
              </p>
            </div>

            {!picksOpen ? (
              <div className="picks-gated-notice" style={{ marginTop: '1.5rem' }}>
                <span className={`match-status-chip match-status-chip--${effectiveStatus}`}>
                  {MATCH_STATUS_LABELS[effectiveStatus]}
                </span>
                <p>
                  {effectiveStatus === MatchStatusValue.NotStarted
                    ? 'Questions are not yet available. Check back once picks are open.'
                    : 'Picks are closed — your selections are shown below.'}
                </p>
              </div>
            ) : null}

            {questionsVisible && questions.length === 0 ? (
              <p className="subtle" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                No questions available for this match yet.
              </p>
            ) : null}

            {questionsVisible && questions.length > 0 ? (
              <div className="question-list">
                {questions.map((question) => {
                  const locked = !picksOpen || isClosed(question.closesAtIst)
                  const selectedOption = questionSelections[question.id]
                  return (
                    <div className="question-card" key={question.id}>
                      <div className="question-head">
                        <div className="question-head-top">
                          <span className="question-credits">{question.credits} credits</span>
                          <span className={locked ? 'lock-note locked' : 'lock-note open'}>
                            {locked ? '🔒 Locked' : '✓ Open'}
                          </span>
                        </div>
                        <h3>{question.sequence}. {question.questionText}</h3>
                      </div>
                      <div className="option-list">
                        {question.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            className={selectedOption === option.id ? 'option-btn active' : 'option-btn'}
                            onClick={() => void onSaveSelection(question, option.id)}
                            disabled={locked}
                          >
                            {option.optionText}
                          </button>
                        ))}
                      </div>
                      {saveErrors[question.id] ? (
                        <p className="save-error">{saveErrors[question.id]}</p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ) : null}
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

