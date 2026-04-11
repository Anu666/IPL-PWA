import { useState, useEffect, useMemo } from 'react'
import { isClosed } from '../lib/time'
import { MatchStatusValue, MATCH_STATUS_LABELS, OutcomeType } from '../lib/types'
import type { MatchStatusRecord, Question } from '../lib/types'
import { api } from '../lib/api'
import { useMatchData } from '../hooks/useMatchData'
import styles from './MatchDetailPanel.module.css'

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

// Module-level lookups for dynamic variant classes
const COMMUNITY_CHIP_CLASS: Record<string, string> = {
  won: styles.communityChipWon,
  lost: styles.communityChipLost,
  autolost: styles.communityChipAutolost,
  voided: styles.communityChipVoided,
}

const OUTCOME_CHIP_CLASS: Record<string, string> = {
  won: styles.outcomeChipWon,
  lost: styles.outcomeChipLost,
  voided: styles.outcomeChipVoided,
}

interface MatchDetailPanelProps {
  matchId: string | null
  effectiveStartDate: string
  isDelayed: boolean
  apiStatus: number
  userId: string | null
}

export function MatchDetailPanel({
  matchId,
  effectiveStartDate,
  isDelayed,
  apiStatus,
  userId,
}: MatchDetailPanelProps) {
  // Effective status respects isDelayed (keep ReadyForPicks even after start time)
  const effectiveStatus =
    apiStatus === MatchStatusValue.ReadyForPicks && isDelayed
      ? MatchStatusValue.ReadyForPicks
      : apiStatus === MatchStatusValue.ReadyForPicks && isClosed(effectiveStartDate)
      ? MatchStatusValue.PicksClosed
      : apiStatus

  const picksOpen = effectiveStatus === MatchStatusValue.ReadyForPicks
  const isMatchCompleted = effectiveStatus === MatchStatusValue.MatchCompleted
  const isSettled = effectiveStatus >= MatchStatusValue.BetsSettled
  const isTransactionsSettled = effectiveStatus >= MatchStatusValue.TransactionsSettled
  const isDone = effectiveStatus === MatchStatusValue.Done
  const questionsVisible = effectiveStatus !== MatchStatusValue.NotStarted && !isSettled
  const showBettingStats = effectiveStatus >= MatchStatusValue.BetsUpdated && !isSettled

  // 1-second tick for countdown when match is in final 10 minutes
  const [, setSecondTick] = useState(0)
  useEffect(() => {
    const msToStart = new Date(effectiveStartDate).getTime() - Date.now()
    const isNearStart = msToStart > 0 && msToStart <= 10 * 60 * 1000
    if (!isNearStart) return
    const id = setInterval(() => setSecondTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [effectiveStartDate])

  // Questions, selections, and save logic
  const { questions, loading, questionSelections, saveErrors, saveSelection } = useMatchData(
    matchId,
    userId,
    effectiveStartDate,
  )

  // Full MatchStatusRecord (with matchSummary) when settled
  const [matchStatusRecord, setMatchStatusRecord] = useState<MatchStatusRecord | null>(null)
  useEffect(() => {
    if (!matchId || !isSettled) {
      setMatchStatusRecord(null)
      return
    }
    api.matchStatuses
      .getByMatchId(matchId)
      .then(setMatchStatusRecord)
      .catch(() => setMatchStatusRecord(null))
  }, [matchId, isSettled])

  const personalOutcome = useMemo(() => {
    if (!matchStatusRecord?.matchSummary || !userId) return null
    return matchStatusRecord.matchSummary.find((e) => e.userId === userId) ?? null
  }, [matchStatusRecord, userId])

  const rankedSummary = useMemo(() => {
    if (!matchStatusRecord?.matchSummary) return []
    return [...matchStatusRecord.matchSummary].sort(
      (a, b) => b.overallCreditChange - a.overallCreditChange,
    )
  }, [matchStatusRecord])

  const getQuestionOutcomeInfo = (question: Question, selectedOption: number | undefined) => {
    const fs = question.finalStats
    if (!fs) return null
    if (fs.isVoided) return { label: 'Voided', cssClass: 'voided', deltaText: '±0 cr' }
    if (selectedOption === undefined)
      return { label: 'Auto-Lost', cssClass: 'lost', deltaText: `−${question.credits.toFixed(2)} cr` }
    if (selectedOption === fs.correctOptionId) {
      const delta =
        fs.creditChangePerWinner > 0
          ? `+${fs.creditChangePerWinner.toFixed(2)} cr`
          : '±0 cr (no bonus)'
      return { label: 'Won', cssClass: 'won', deltaText: delta }
    }
    return { label: 'Lost', cssClass: 'lost', deltaText: `−${question.credits.toFixed(2)} cr` }
  }

  const [showStatsModal, setShowStatsModal] = useState(false)

  return (
    <>
      {/* ── Loading indicator ──────────────────────────────────────────── */}
      {loading && (
        <div className={styles.panelLoading}>
          <span className={styles.panelSpinner} />
          <span className={styles.panelLoadingText}>Loading…</span>
        </div>
      )}

      {!loading && (
        <>
      {/* ── Delayed banner ─────────────────────────────────────────────── */}
      {isDelayed && picksOpen && (
        <div
          className={styles.statusBanner}
          style={{ background: '#f59e0b22', borderColor: '#f59e0b66', color: '#f59e0b' }}
        >
          ⏸ This match has been delayed. Picks are still open — you can update your selections.
        </div>
      )}

      {/* ── MatchCompleted banner ──────────────────────────────────────── */}
      {isMatchCompleted && (
        <div className={`${styles.statusBanner} ${styles.statusBannerMatchCompleted}`}>
          🏁 Match completed — credits will be settled shortly
        </div>
      )}

      {/* ── BetsSettled+ settlement view ───────────────────────────────── */}
      {isSettled && (
        <div className={styles.settlementView}>
          {isDone ? (
            <div className={`${styles.statusBanner} ${styles.statusBannerDone}`}>
              🏆 This match has been successfully completed
            </div>
          ) : isTransactionsSettled ? (
            <div className={`${styles.statusBanner} ${styles.statusBannerTxnSettled}`}>
              ✅ Credits are now reflected in your account
            </div>
          ) : (
            <div className={`${styles.statusBanner} ${styles.statusBannerBetsSettled}`}>
              ✅ Bets settled — credits being processed
            </div>
          )}

          {questions.length > 0 && (
            <div className={styles.outcomeSection}>
              {personalOutcome !== null && (
                <div
                  className={`${styles.outcomeTotalCard} ${
                    personalOutcome.overallCreditChange >= 0
                      ? styles.outcomeTotalCardPos
                      : styles.outcomeTotalCardNeg
                  }`}
                >
                  <span className={styles.outcomeTotalLabel}>Your result</span>
                  <span className={styles.outcomeTotalValue}>
                    {personalOutcome.overallCreditChange >= 0 ? '+' : ''}
                    {personalOutcome.overallCreditChange.toFixed(2)} cr
                  </span>
                </div>
              )}

              <div className={styles.outcomeQuestionList}>
                {questions.map((q) => {
                  const selectedOption = questionSelections[q.id]
                  const info = getQuestionOutcomeInfo(q, selectedOption)
                  const correctOption = q.finalStats?.correctOptionId
                  const correctLabel =
                    correctOption !== undefined && correctOption !== null
                      ? (q.options.find((o) => o.id === correctOption)?.optionText ?? '—')
                      : '—'
                  const myLabel =
                    selectedOption !== undefined
                      ? (q.options.find((o) => o.id === selectedOption)?.optionText ?? '—')
                      : 'Not answered'
                  return (
                    <div key={q.id} className={styles.outcomeQuestionRow}>
                      <div className={styles.outcomeQHeader}>
                        <div className={styles.outcomeQText}>
                          {q.sequence}. {q.questionText}
                        </div>
                        <span className={styles.questionCredits}>{q.credits.toFixed(2)} cr</span>
                      </div>
                      <div className={styles.outcomeQMeta}>
                        <span className={styles.outcomeQMypick}>Your pick: {myLabel}</span>
                        <span className={styles.outcomeQCorrect}>Correct pick: {correctLabel}</span>
                      </div>
                      {info && (
                        <div className={styles.outcomeQResult}>
                          <span className={`${styles.outcomeChip} ${OUTCOME_CHIP_CLASS[info.cssClass] ?? ''}`}>
                            {info.label}
                          </span>
                          <span
                            className={`${styles.outcomeDelta}${
                              info.cssClass === 'won'
                                ? ' ' + styles.outcomeDeltaPos
                                : info.cssClass === 'voided'
                                ? ''
                                : ' ' + styles.outcomeDeltaNeg
                            }`}
                          >
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
          {rankedSummary.length > 0 && (
            <div className={styles.communitySection}>
              <h4 className={styles.communityTitle}>Match Leaderboard</h4>
              <div className={styles.communityTableWrap}>
                <table className={styles.communityTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Net</th>
                      {questions.map((q) => (
                        <th key={q.id} title={q.questionText}>
                          Q{q.sequence}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rankedSummary.map((entry, idx) => (
                      <tr
                        key={entry.userId}
                        className={entry.userId === userId ? styles.communityRowMe : ''}
                      >
                        <td>{idx + 1}</td>
                        <td className={styles.communityName}>
                          {entry.userName}
                          {entry.userId === userId ? ' (you)' : ''}
                        </td>
                        <td
                          className={
                            entry.overallCreditChange >= 0 ? styles.creditPos : styles.creditNeg
                          }
                        >
                          {entry.overallCreditChange >= 0 ? '+' : ''}
                          {entry.overallCreditChange.toFixed(2)}
                        </td>
                        {questions.map((q) => {
                          const change = entry.changes.find((c) => c.questionId === q.id)
                          if (!change) return <td key={q.id}>—</td>
                          return (
                            <td key={q.id}>
                              <span
                                className={`${styles.communityChip} ${COMMUNITY_CHIP_CLASS[OUTCOME_CSS_CLASS[change.outcome] ?? 'voided'] ?? ''}`}
                              >
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

          {questions.some((q) => q.bettingStats) && (
            <button
              type="button"
              className={styles.pwaStatsBtn}
              style={{ marginTop: '1rem' }}
              onClick={() => setShowStatsModal(true)}
            >
              📊 View Betting Stats
            </button>
          )}
        </div>
      )}

      {/* ── Picks gated notice ─────────────────────────────────────────── */}
      {!picksOpen && !isSettled && (
        <div className={styles.picksGatedNotice}>
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
        <button type="button" className={styles.pwaStatsBtn} onClick={() => setShowStatsModal(true)}>
          📊 View Betting Stats
        </button>
      ) : null}

      {questionsVisible && questions.length > 0 ? (
        <div className={styles.questionList}>
          {questions.map((question) => {
            const locked = !picksOpen || isClosed(question.closesAtIst)
            const selectedOption = questionSelections[question.id]
            return (
              <div className={styles.questionCard} key={question.id}>
                <div className={styles.questionHead}>
                  <div className={styles.questionHeadTop}>
                    <span className={styles.questionCredits}>{question.credits.toFixed(2)} credits</span>
                    <span className={locked ? `${styles.lockNote} ${styles.locked}` : `${styles.lockNote} ${styles.open}`}>
                      {locked ? '🔒 Locked' : '✓ Open'}
                    </span>
                  </div>
                  <h3>
                    {question.sequence}. {question.questionText}
                  </h3>
                </div>
                <div
                  className={styles.optionList}
                  style={{
                    gridTemplateColumns:
                      question.options.length > 3 ? 'repeat(2, 1fr)' : '1fr',
                  }}
                >
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={
                        selectedOption === option.id
                          ? `${styles.optionBtn} ${styles.active}`
                          : styles.optionBtn
                      }
                      onClick={() => void saveSelection(question, option.id)}
                      disabled={locked}
                    >
                      {option.optionText}
                    </button>
                  ))}
                </div>
                {saveErrors[question.id] ? (
                  <p className={styles.saveError}>{saveErrors[question.id]}</p>
                ) : null}

                {showBettingStats && question.bettingStats
                  ? (() => {
                      const stats = question.bettingStats!
                      const allOtherOptionsUnvoted =
                        selectedOption !== undefined &&
                        stats.optionStats
                          .filter((os) => os.optionId !== selectedOption)
                          .every((os) => os.voteCount === 0)
                      if (stats.totalVotes === 0) {
                        return (
                          <div className={styles.pwaOutcomeLine}>
                            <span className={styles.pwaOutcomeNobonus}>No bonus · No loss</span>
                          </div>
                        )
                      }
                      if (selectedOption === undefined) {
                        const allOptionsHaveVoters = stats.optionStats.every(
                          (os) => os.voteCount > 0,
                        )
                        return (
                          <div className={styles.pwaOutcomeLine}>
                            <span className={styles.pwaOutcomeWrong}>
                              Not answered ·{' '}
                              {allOptionsHaveVoters
                                ? `−${question.credits.toFixed(2)} cr auto-loss`
                                : `May lose −${question.credits.toFixed(2)} cr`}
                            </span>
                          </div>
                        )
                      }
                      const myOptionStat = stats.optionStats.find(
                        (os) => os.optionId === selectedOption,
                      )
                      const bonus = myOptionStat?.potentialWinCredits ?? 0
                      const hasUnvotedOptions = stats.optionStats.some((os) => os.voteCount === 0)
                      return (
                        <div className={styles.pwaOutcomeLine}>
                          {bonus > 0 ? (
                            <span className={styles.pwaOutcomeCorrect}>
                              If correct: +{bonus.toFixed(2)} cr
                            </span>
                          ) : (
                            <span className={styles.pwaOutcomeNobonus}>If correct: No bonus</span>
                          )}
                          <span className={styles.pwaOutcomeSep}>·</span>
                          {allOtherOptionsUnvoted ? (
                            <span className={styles.pwaOutcomeNobonus}>If wrong: No loss</span>
                          ) : hasUnvotedOptions ? (
                            <span className={styles.pwaOutcomeWrong}>
                              If wrong: May lose −{question.credits.toFixed(2)} cr
                            </span>
                          ) : (
                            <span className={styles.pwaOutcomeWrong}>
                              If wrong: −{question.credits.toFixed(2)} cr
                            </span>
                          )}
                        </div>
                      )
                    })()
                  : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {/* ── Betting stats modal ────────────────────────────────────────── */}
      {showStatsModal ? (
        <div
          className={styles.pwaStatsModalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowStatsModal(false)
          }}
        >
          <div className={styles.pwaStatsModal}>
            <div className={styles.pwaStatsModalHeader}>
              <h3>Betting Stats</h3>
              <button
                type="button"
                className={styles.pwaStatsModalClose}
                onClick={() => setShowStatsModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.pwaStatsModalBody}>
              {questions
                .filter((q) => q.bettingStats)
                .map((question) => {
                  const selectedOption = questionSelections[question.id]
                  return (
                    <div key={question.id} className={styles.pwaStatsModalQuestion}>
                      <div className={styles.pwaStatsModalQuestionTitle}>
                        {question.sequence}. {question.questionText}
                      </div>
                      <div className={styles.pwaBettingSummary}>
                        <span className={styles.pwaStatPill}>
                          {question.bettingStats!.totalEligible} eligible
                        </span>
                        <span className={`${styles.pwaStatPill} ${styles.pwaStatPillGreen}`}>
                          {question.bettingStats!.totalVotes} answered
                        </span>
                        {question.bettingStats!.unansweredCount > 0 && (
                          <span className={`${styles.pwaStatPill} ${styles.pwaStatPillRed}`}>
                            {question.bettingStats!.unansweredCount} unanswered
                          </span>
                        )}
                      </div>
                      <div className={styles.pwaOptionStats}>
                        {question.bettingStats!.optionStats.map((os) => {
                          const option = question.options.find((o) => o.id === os.optionId)
                          const pct =
                            question.bettingStats!.totalEligible > 0
                              ? (os.voteCount / question.bettingStats!.totalEligible) * 100
                              : 0
                          const isMyPick = selectedOption === os.optionId
                          return (
                            <div
                              key={os.optionId}
                              className={isMyPick ? `${styles.pwaOptionStat} ${styles.pwaOptionStatMine}` : styles.pwaOptionStat}
                            >
                              <div className={styles.pwaOptionStatRow}>
                                <span className={styles.pwaOptionStatName}>
                                  {option?.optionText ?? `Option ${os.optionId}`}
                                </span>
                                <span className={styles.pwaOptionStatCount}>
                                  {os.voteCount}/{question.bettingStats!.totalEligible}
                                </span>
                                {os.potentialWinCredits > 0 ? (
                                  <span className={styles.pwaOptionWin}>
                                    +{os.potentialWinCredits.toFixed(2)} cr
                                  </span>
                                ) : (
                                  <span className={styles.pwaOptionNowin}>No bonus</span>
                                )}
                              </div>
                              <div className={styles.pwaBarTrack}>
                                <div
                                  className={`${styles.pwaBarFill} ${styles[`pwa-bar-fill--${os.optionId}`] ?? ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              {os.voters.length > 0 && (
                                <div className={styles.pwaVoterChips}>
                                  {os.voters.map((v) => (
                                    <span
                                      key={v.userId}
                                      className={
                                        selectedOption === os.optionId
                                          ? `${styles.pwaVoterChip} ${styles.pwaVoterChipMine}`
                                          : styles.pwaVoterChip
                                      }
                                    >
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
        </>
      )}
    </>
  )
}
