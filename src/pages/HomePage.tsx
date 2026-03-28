import { useEffect, useMemo, useState } from 'react'
import { countdownLabel, isClosed, toDisplayDate } from '../lib/time'
import { MatchStatusValue, MATCH_STATUS_LABELS, OutcomeType } from '../lib/types'
import type { Match, MatchStatusRecord, Question } from '../lib/types'
import { api } from '../lib/api'

// ── Group definitions ─────────────────────────────────────────────────────────
type GroupKey = 'ready' | 'inProgress' | 'completed'

const GROUP_LABELS: Record<GroupKey, string> = {
  ready: 'Ready for Picks',
  inProgress: 'In Progress',
  completed: 'Completed',
}

const IN_PROGRESS_STATUSES = new Set([
  MatchStatusValue.PicksClosed,
  MatchStatusValue.BetsUpdated,
  MatchStatusValue.MatchCompleted,
  MatchStatusValue.BetsSettled,
  MatchStatusValue.TransactionsSettled,
])

const getGroup = (status: number): GroupKey | null => {
  if (status === MatchStatusValue.ReadyForPicks) return 'ready'
  if (IN_PROGRESS_STATUSES.has(status as typeof MatchStatusValue[keyof typeof MatchStatusValue])) return 'inProgress'
  if (status === MatchStatusValue.Done) return 'completed'
  return null
}

const OUTCOME_SHORT: Record<number, string> = {
  [OutcomeType.Won]: 'W',
  [OutcomeType.Lost]: 'L',
  [OutcomeType.AutoLost]: 'AL',
  [OutcomeType.Voided]: 'V',
}

const OUTCOME_CSS_CLASS: Record<number, string> = {
  [OutcomeType.Won]: 'won',
  [OutcomeType.Lost]: 'lost',
  [OutcomeType.AutoLost]: 'autolost',
  [OutcomeType.Voided]: 'voided',
}

interface HomePageProps {
  match: Match | null
  homeMatches: Match[]
  selectedHomeMatchId: string | null
  questions: Question[]
  questionSelections: Record<string, number>
  saveErrors: Record<string, string>
  matchStatuses: Record<string, number>
  userId: string | null
  onSelectMatch: (matchId: string) => void
  onSaveSelection: (question: Question, selectedOptionId: number) => Promise<void>
}

export function HomePage({ match, homeMatches, selectedHomeMatchId, questions, questionSelections, saveErrors, matchStatuses, userId, onSelectMatch, onSaveSelection }: HomePageProps) {
  const msToStart = match ? new Date(match.matchCommenceStartDate).getTime() - Date.now() : Infinity
  const isLastTenMin = msToStart > 0 && msToStart <= 10 * 60 * 1000

  const [, setSecondTick] = useState(0)
  useEffect(() => {
    if (!isLastTenMin) return
    const id = setInterval(() => setSecondTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isLastTenMin])

  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<GroupKey | null>(null)
  const [matchStatusRecord, setMatchStatusRecord] = useState<MatchStatusRecord | null>(null)

  // ── Per-match effective status helper ────────────────────────────────────────
  const getEffectiveStatusForMatch = (m: Match): number => {
    const s = matchStatuses[m.id] ?? MatchStatusValue.NotStarted
    if (s === MatchStatusValue.ReadyForPicks && isClosed(m.matchCommenceStartDate)) {
      return MatchStatusValue.PicksClosed
    }
    return s
  }

  // ── Group counts from visible home matches ────────────────────────────────────
  const groupCounts = useMemo(() => {
    const counts: Partial<Record<GroupKey, number>> = {}
    for (const m of homeMatches) {
      const eff = getEffectiveStatusForMatch(m)
      const g = getGroup(eff)
      if (g) counts[g] = (counts[g] ?? 0) + 1
    }
    return counts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMatches, matchStatuses])

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

  // Matches for the selected group, sorted chronologically
  const visibleMatches = useMemo(() => {
    if (!selectedGroup) return []
    return homeMatches
      .filter((m) => getGroup(getEffectiveStatusForMatch(m)) === selectedGroup)
      .sort((a, b) => new Date(a.matchCommenceStartDate).getTime() - new Date(b.matchCommenceStartDate).getTime())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeMatches, matchStatuses, selectedGroup])

  // When visible matches change, ensure selectedHomeMatchId is in view
  useEffect(() => {
    if (visibleMatches.length > 0 && !visibleMatches.some((m) => m.id === selectedHomeMatchId)) {
      onSelectMatch(visibleMatches[0].id)
    }
  }, [visibleMatches, selectedHomeMatchId, onSelectMatch])

  // Effective status for SELECTED match
  const apiStatus = match ? (matchStatuses[match.id] ?? MatchStatusValue.NotStarted) : MatchStatusValue.NotStarted
  const effectiveStatus =
    apiStatus === MatchStatusValue.ReadyForPicks && match && isClosed(match.matchCommenceStartDate)
      ? MatchStatusValue.PicksClosed
      : apiStatus

  const picksOpen = effectiveStatus === MatchStatusValue.ReadyForPicks
  const isMatchCompleted = effectiveStatus === MatchStatusValue.MatchCompleted
  const isSettled = effectiveStatus >= MatchStatusValue.BetsSettled
  const isTransactionsSettled = effectiveStatus >= MatchStatusValue.TransactionsSettled
  const isDone = effectiveStatus === MatchStatusValue.Done
  const questionsVisible = effectiveStatus !== MatchStatusValue.NotStarted && !isSettled
  const showBettingStats = effectiveStatus >= MatchStatusValue.BetsUpdated && !isSettled

  // Fetch full MatchStatusRecord (with matchSummary) when status is BetsSettled+
  useEffect(() => {
    if (!match || !isSettled) {
      setMatchStatusRecord(null)
      return
    }
    api.matchStatuses.getByMatchId(match.id)
      .then(setMatchStatusRecord)
      .catch(() => setMatchStatusRecord(null))
  }, [match?.id, isSettled])

  // Personal outcome from matchSummary
  const personalOutcome = useMemo(() => {
    if (!matchStatusRecord?.matchSummary || !userId) return null
    return matchStatusRecord.matchSummary.find((e) => e.userId === userId) ?? null
  }, [matchStatusRecord, userId])

  // Community leaderboard sorted by overallCreditChange DESC
  const rankedSummary = useMemo(() => {
    if (!matchStatusRecord?.matchSummary) return []
    return [...matchStatusRecord.matchSummary].sort((a, b) => b.overallCreditChange - a.overallCreditChange)
  }, [matchStatusRecord])

  const getQuestionOutcomeInfo = (question: Question, selectedOption: number | undefined) => {
    const fs = question.finalStats
    if (!fs) return null
    if (fs.isVoided) return { label: 'Voided', cssClass: 'voided', deltaText: '±0 cr' }
    if (selectedOption === undefined) return { label: 'Auto-Lost', cssClass: 'lost', deltaText: `−${question.credits} cr` }
    if (selectedOption === fs.correctOptionId) {
      const delta = fs.creditChangePerWinner > 0 ? `+${fs.creditChangePerWinner.toFixed(2)} cr` : '±0 cr (no bonus)'
      return { label: 'Won', cssClass: 'won', deltaText: delta }
    }
    return { label: 'Lost', cssClass: 'lost', deltaText: `−${question.credits} cr` }
  }

  return (
    <div className="home-wrapper">
      {/* Group filter chips — outside the panel */}
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

            {/* ── MatchCompleted banner ─────────────────────────────────── */}
            {isMatchCompleted && (
              <div className="status-banner status-banner--match-completed">
                🏁 Match completed — credits will be settled shortly
              </div>
            )}

            {/* ── BetsSettled+ settlement view ──────────────────────────── */}
            {isSettled && (
              <div className="settlement-view">
                {isDone ? (
                  <div className="status-banner status-banner--done">
                    🏆 This match has been successfully completed
                  </div>
                ) : isTransactionsSettled ? (
                  <div className="status-banner status-banner--txn-settled">
                    ✅ Credits are now reflected in your account
                  </div>
                ) : (
                  <div className="status-banner status-banner--bets-settled">
                    ✅ Bets settled — credits being processed
                  </div>
                )}

                {/* Personal outcome */}
                {questions.length > 0 && (
                  <div className="outcome-section">
                    {personalOutcome !== null && (
                      <div className={`outcome-total-card${personalOutcome.overallCreditChange >= 0 ? ' outcome-total-card--pos' : ' outcome-total-card--neg'}`}>
                        <span className="outcome-total-label">Your result</span>
                        <span className="outcome-total-value">
                          {personalOutcome.overallCreditChange >= 0 ? '+' : ''}{personalOutcome.overallCreditChange.toFixed(2)} cr
                        </span>
                      </div>
                    )}

                    <div className="outcome-question-list">
                      {questions.map((q) => {
                        const selectedOption = questionSelections[q.id]
                        const info = getQuestionOutcomeInfo(q, selectedOption)
                        const correctOption = q.finalStats?.correctOptionId
                        const correctLabel = correctOption !== undefined && correctOption !== null
                          ? (q.options.find((o) => o.id === correctOption)?.optionText ?? '—')
                          : '—'
                        const myLabel = selectedOption !== undefined
                          ? (q.options.find((o) => o.id === selectedOption)?.optionText ?? '—')
                          : 'Not answered'
                        return (
                          <div key={q.id} className="outcome-question-row">
                            <div className="outcome-q-text">{q.sequence}. {q.questionText}</div>
                            <div className="outcome-q-meta">
                              <span className="outcome-q-mypick">Your pick: {myLabel}</span>
                              <span className="outcome-q-correct">Correct: {correctLabel}</span>
                            </div>
                            {info && (
                              <div className="outcome-q-result">
                                <span className={`outcome-chip outcome-chip--${info.cssClass}`}>{info.label}</span>
                                <span className={`outcome-delta${info.cssClass === 'won' ? ' outcome-delta--pos' : info.cssClass === 'voided' ? '' : ' outcome-delta--neg'}`}>
                                  {info.deltaText}
                                </span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Match leaderboard */}
                {rankedSummary.length > 0 && (
                  <div className="community-section">
                    <h4 className="community-title">Match Leaderboard</h4>
                    <div className="community-table-wrap">
                      <table className="community-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Net</th>
                            {questions.map((q) => (
                              <th key={q.id} title={q.questionText}>Q{q.sequence}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rankedSummary.map((entry, idx) => (
                            <tr
                              key={entry.userId}
                              className={entry.userId === userId ? 'community-row--me' : ''}
                            >
                              <td>{idx + 1}</td>
                              <td className="community-name">{entry.userName}{entry.userId === userId ? ' (you)' : ''}</td>
                              <td className={entry.overallCreditChange >= 0 ? 'credit-pos' : 'credit-neg'}>
                                {entry.overallCreditChange >= 0 ? '+' : ''}{entry.overallCreditChange.toFixed(2)}
                              </td>
                              {questions.map((q) => {
                                const change = entry.changes.find((c) => c.questionId === q.id)
                                if (!change) return <td key={q.id}>—</td>
                                return (
                                  <td key={q.id}>
                                    <span className={`community-chip community-chip--${OUTCOME_CSS_CLASS[change.outcome] ?? 'voided'}`}>
                                      {OUTCOME_SHORT[change.outcome] ?? '?'}
                                    </span>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Regular question notice for locked statuses ───────────── */}
            {!picksOpen && !isSettled && (
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
            )}

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
