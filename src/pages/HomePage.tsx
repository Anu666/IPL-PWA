import { countdownLabel, isClosed, toDisplayDate } from '../lib/time'
import type { Match, Question } from '../lib/types'

interface HomePageProps {
  todayOrUpcomingMatches: Match[]
  selectedHomeMatchId: number | null
  selectedHomeMatch: Match | null
  questions: Question[]
  questionSelections: Record<string, string>
  onSelectHomeMatch: (matchId: number) => void
  onSaveSelection: (question: Question, selectedOptionId: string) => Promise<void>
}

export function HomePage({
  todayOrUpcomingMatches,
  selectedHomeMatchId,
  selectedHomeMatch,
  questions,
  questionSelections,
  onSelectHomeMatch,
  onSaveSelection,
}: HomePageProps) {
  return (
    <section className="layout-grid">
      <article className="panel">
        <h2>Home</h2>
        <p className="subtle">Current day matches first, then nearest upcoming match.</p>

        <div className="home-match-list">
          {todayOrUpcomingMatches.map((match) => {
            const isActive = selectedHomeMatchId === match.id
            return (
              <button
                key={match.id}
                type="button"
                className={isActive ? 'match-card active' : 'match-card'}
                onClick={() => onSelectHomeMatch(match.id)}
              >
                <div className="match-card-head">
                  <span>
                    {match.homeTeamCode} vs {match.awayTeamCode}
                  </span>
                  <strong>{match.status}</strong>
                </div>
                <p>{match.name}</p>
                <small>
                  {toDisplayDate(match.startsAtIst)} | {countdownLabel(match.startsAtIst)}
                </small>
              </button>
            )
          })}
        </div>
      </article>

      <article className="panel">
        <h2>{selectedHomeMatch ? selectedHomeMatch.name : 'No current or upcoming match'}</h2>
        {selectedHomeMatch ? (
          <p className="subtle">
            {selectedHomeMatch.groundName}, {selectedHomeMatch.city} | Starts{' '}
            {toDisplayDate(selectedHomeMatch.startsAtIst)}
          </p>
        ) : (
          <p className="subtle">No matches available right now.</p>
        )}

        <div className="question-list">
          {questions.map((question) => {
            const locked = isClosed(question.closesAtIst)
            const selectedOption = questionSelections[question.id]

            return (
              <div className="question-card" key={question.id}>
                <div className="question-head">
                  <h3>
                    {question.order}. {question.text}
                  </h3>
                  <span>{question.creditValue} credits</span>
                </div>
                <p className="subtle">Closes at {toDisplayDate(question.closesAtIst)}</p>
                <div className="option-list">
                  {question.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={selectedOption === option.id ? 'option-btn active' : 'option-btn'}
                      onClick={() => void onSaveSelection(question, option.id)}
                      disabled={locked}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className={locked ? 'lock-note locked' : 'lock-note open'}>
                  {locked ? 'Locked: match has started.' : 'Open for picks.'}
                </p>
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}
