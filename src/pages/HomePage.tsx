import { useEffect, useState } from 'react'
import { countdownLabel, isClosed, toDisplayDate } from '../lib/time'
import type { Match, Question } from '../lib/types'

interface HomePageProps {
  match: Match | null
  questions: Question[]
  questionSelections: Record<string, number>
  saveErrors: Record<string, string>
  onSaveSelection: (question: Question, selectedOptionId: number) => Promise<void>
}

export function HomePage({ match, questions, questionSelections, saveErrors, onSaveSelection }: HomePageProps) {
  const msToStart = match ? new Date(match.matchCommenceStartDate).getTime() - Date.now() : Infinity
  const isLastTenMin = msToStart > 0 && msToStart <= 10 * 60 * 1000

  // 1-second local tick so seconds stay live in the final 10 minutes
  const [, setSecondTick] = useState(0)
  useEffect(() => {
    if (!isLastTenMin) return
    const id = setInterval(() => setSecondTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [isLastTenMin])

  return (
    <section className="panel home-panel">
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

          {questions.length === 0 ? (
            <p className="subtle" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              No questions available for this match yet.
            </p>
          ) : (
            <div className="question-list">
              {questions.map((question) => {
                const locked = isClosed(question.closesAtIst)
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
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <h2 style={{ margin: '0 0 0.5rem' }}>No Upcoming Match</h2>
          <p className="subtle">Check back when the next match is scheduled.</p>
        </div>
      )}
    </section>
  )
}
