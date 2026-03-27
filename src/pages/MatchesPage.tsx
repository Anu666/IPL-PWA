import { useState, useEffect } from 'react'
import { countdownLabel, isClosed, toDisplayDate } from '../lib/time'
import { MatchStatusValue, MATCH_STATUS_LABELS } from '../lib/types'
import type { Match, Question } from '../lib/types'

export type MatchFilter = 'all' | 'active' | 'upcoming' | 'past'

interface MatchesPageProps {
  matches: Match[]
  selectedMatchId: string | null
  selectedMatch: Match | null
  questions: Question[]
  activeFilter: MatchFilter
  questionSelections: Record<string, number>
  saveErrors: Record<string, string>
  matchStatuses: Record<string, number>
  onFilterChange: (nextFilter: MatchFilter) => void
  onSelectMatch: (matchId: string) => void
  onSaveSelection: (question: Question, selectedOptionId: number) => Promise<void>
}

export function MatchesPage({
  matches,
  selectedMatchId,
  selectedMatch,
  questions,
  activeFilter,
  questionSelections,
  saveErrors,
  matchStatuses,
  onFilterChange,
  onSelectMatch,
  onSaveSelection,
}: MatchesPageProps) {
  // 1-second tick when selected match is in its final 10 minutes (for instant lock flip)
  const [, setSecondTick] = useState(0)
  const [showStatsModal, setShowStatsModal] = useState(false)
  useEffect(() => {
    if (!selectedMatch) return
    const msToStart = new Date(selectedMatch.matchCommenceStartDate).getTime() - Date.now()
    const isNearStart = msToStart > 0 && msToStart <= 10 * 60 * 1000
    if (!isNearStart) return
    const id = setInterval(() => setSecondTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [selectedMatch])

  const getEffectiveStatus = (match: Match): number => {
    const apiStatus = matchStatuses[match.id] ?? MatchStatusValue.NotStarted
    if (apiStatus === MatchStatusValue.ReadyForPicks && isClosed(match.matchCommenceStartDate)) {
      return MatchStatusValue.PicksClosed
    }
    return apiStatus
  }

  const selectedEffectiveStatus = selectedMatch ? getEffectiveStatus(selectedMatch) : MatchStatusValue.NotStarted
  const picksOpen = selectedEffectiveStatus === MatchStatusValue.ReadyForPicks
  const questionsVisible = selectedEffectiveStatus !== MatchStatusValue.NotStarted
  const showBettingStats = selectedEffectiveStatus >= MatchStatusValue.BetsUpdated

  return (
    <section className="layout-grid">
      <article className="panel">
        <h2>Match List</h2>
        <p className="subtle">Each match has 5 questions, total 50 credits.</p>
        <div className="filter-row" role="group" aria-label="Match filters">
          <button
            type="button"
            className={activeFilter === 'all' ? 'filter-chip active' : 'filter-chip'}
            onClick={() => onFilterChange('all')}
          >
            All
          </button>
          <button
            type="button"
            className={activeFilter === 'active' ? 'filter-chip active' : 'filter-chip'}
            onClick={() => onFilterChange('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={activeFilter === 'upcoming' ? 'filter-chip active' : 'filter-chip'}
            onClick={() => onFilterChange('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={activeFilter === 'past' ? 'filter-chip active' : 'filter-chip'}
            onClick={() => onFilterChange('past')}
          >
            Past
          </button>
        </div>
        <div className="match-list">
          {matches.length === 0 ? <p className="subtle">No matches for this filter.</p> : null}
          {matches.map((match) => {
            const closeLabel = countdownLabel(match.matchCommenceStartDate)
            const isActive = selectedMatchId === match.id
            const effectiveStatus = getEffectiveStatus(match)
            return (
              <button
                key={match.id}
                type="button"
                className={isActive ? 'match-card active' : 'match-card'}
                onClick={() => onSelectMatch(match.id)}
              >
                <div className="match-card-head">
                  <span>
                    {match.firstBattingTeamCode} vs {match.secondBattingTeamCode}
                  </span>
                  <span className={`match-status-chip match-status-chip--${effectiveStatus}`}>
                    {MATCH_STATUS_LABELS[effectiveStatus]}
                  </span>
                </div>
                <p>{match.matchName}</p>
                <small>
                  {toDisplayDate(match.matchCommenceStartDate)} | {closeLabel}
                </small>
              </button>
            )
          })}
        </div>
      </article>

      <article className="panel">
        <h2>{selectedMatch ? selectedMatch.matchName : 'Select a match'}</h2>
        {selectedMatch ? (
          <p className="subtle">
            {selectedMatch.groundName}, {selectedMatch.city} | Starts{' '}
            {toDisplayDate(selectedMatch.matchCommenceStartDate)}
          </p>
        ) : null}

        {selectedMatch && !picksOpen ? (
          <div className="picks-gated-notice">
            <span className={`match-status-chip match-status-chip--${selectedEffectiveStatus}`}>
              {MATCH_STATUS_LABELS[selectedEffectiveStatus]}
            </span>
            <p>
              {selectedEffectiveStatus === MatchStatusValue.NotStarted
                ? 'Questions are not yet available. Check back once picks are open.'
                : 'Picks are closed — your selections are shown below.'}
            </p>
          </div>
        ) : null}

        {showBettingStats && questions.some((q) => q.bettingStats) ? (
          <button type="button" className="pwa-stats-btn" onClick={() => setShowStatsModal(true)}>
            📊 View Betting Stats
          </button>
        ) : null}
        {questionsVisible ? (
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
                    <h3>
                      {question.sequence}. {question.questionText}
                    </h3>
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
      </article>

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
    </section>
  )
}
