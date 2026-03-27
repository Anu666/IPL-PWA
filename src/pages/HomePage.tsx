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

  const [showStatsModal, setShowStatsModal] = useState(false)
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
  const showBettingStats = effectiveStatus >= MatchStatusValue.BetsUpdated

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

            {questionsVisible && showBettingStats && questions.some((q) => q.bettingStats) ? (
              <button type="button" className="pwa-stats-btn" onClick={() => setShowStatsModal(true)}>
                📊 View Betting Stats
              </button>
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

                      {/* Inline personal outcome — visible when BetsUpdated or beyond */}
                      {showBettingStats && question.bettingStats ? (() => {
                        const stats = question.bettingStats!
                        const allOtherOptionsUnvoted = selectedOption !== undefined &&
                          stats.optionStats.filter((os) => os.optionId !== selectedOption).every((os) => os.voteCount === 0)
                        if (stats.totalVotes === 0) {
                          return (
                            <div className="pwa-outcome-line">
                              <span className="pwa-outcome-nobonus">No bonus · No loss</span>
                            </div>
                          )
                        }
                        if (selectedOption === undefined) {
                          const allOptionsHaveVoters = stats.optionStats.every((os) => os.voteCount > 0)
                          return (
                            <div className="pwa-outcome-line">
                              <span className="pwa-outcome-wrong">
                                Not answered · {allOptionsHaveVoters ? `−${question.credits} cr auto-loss` : `May lose −${question.credits} cr`}
                              </span>
                            </div>
                          )
                        }
                        const myOptionStat = stats.optionStats.find((os) => os.optionId === selectedOption)
                        const bonus = myOptionStat?.potentialWinCredits ?? 0
                        return (
                          <div className="pwa-outcome-line">
                            {bonus > 0 ? (
                              <span className="pwa-outcome-correct">If correct: +{bonus.toFixed(2)} cr</span>
                            ) : (
                              <span className="pwa-outcome-nobonus">If correct: No bonus</span>
                            )}
                            <span className="pwa-outcome-sep">·</span>
                            {allOtherOptionsUnvoted ? (
                              <span className="pwa-outcome-nobonus">If wrong: No loss</span>
                            ) : (
                              <span className="pwa-outcome-wrong">If wrong: −{question.credits} cr</span>
                            )}
                          </div>
                        )
                      })() : null}
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

      {showStatsModal ? (
        <div className="pwa-stats-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowStatsModal(false) }}>
          <div className="pwa-stats-modal">
            <div className="pwa-stats-modal-header">
              <h3>Betting Stats</h3>
              <button type="button" className="pwa-stats-modal-close" onClick={() => setShowStatsModal(false)}>✕</button>
            </div>
            <div className="pwa-stats-modal-body">
              {questions.filter((q) => q.bettingStats).map((question) => {
                const selectedOption = questionSelections[question.id]
                return (
                  <div key={question.id} className="pwa-stats-modal-question">
                    <div className="pwa-stats-modal-question-title">
                      {question.sequence}. {question.questionText}
                    </div>
                    <div className="pwa-betting-summary">
                      <span className="pwa-stat-pill">{question.bettingStats!.totalEligible} eligible</span>
                      <span className="pwa-stat-pill pwa-stat-pill--green">{question.bettingStats!.totalVotes} answered</span>
                      {question.bettingStats!.unansweredCount > 0 && (
                        <span className="pwa-stat-pill pwa-stat-pill--red">
                          {question.bettingStats!.unansweredCount} unanswered
                        </span>
                      )}
                    </div>
                    <div className="pwa-option-stats">
                      {question.bettingStats!.optionStats.map((os) => {
                        const option = question.options.find((o) => o.id === os.optionId)
                        const pct = question.bettingStats!.totalEligible > 0
                          ? (os.voteCount / question.bettingStats!.totalEligible) * 100
                          : 0
                        const isMyPick = selectedOption === os.optionId
                        return (
                          <div key={os.optionId} className={`pwa-option-stat${isMyPick ? ' pwa-option-stat--mine' : ''}`}>
                            <div className="pwa-option-stat-row">
                              <span className="pwa-option-stat-name">
                                {option?.optionText ?? `Option ${os.optionId}`}
                              </span>
                              <span className="pwa-option-stat-count">
                                {os.voteCount}/{question.bettingStats!.totalEligible}
                              </span>
                              {os.potentialWinCredits > 0 ? (
                                <span className="pwa-option-win">+{os.potentialWinCredits.toFixed(2)} cr</span>
                              ) : (
                                <span className="pwa-option-nowin">No bonus</span>
                              )}
                            </div>
                            <div className="pwa-bar-track">
                              <div
                                className={`pwa-bar-fill pwa-bar-fill--${os.optionId}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {os.voters.length > 0 && (
                              <div className="pwa-voter-chips">
                                {os.voters.map((v) => (
                                  <span key={v.userId} className={`pwa-voter-chip${selectedOption === os.optionId ? ' pwa-voter-chip--mine' : ''}`}>
                                    {v.userName}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

