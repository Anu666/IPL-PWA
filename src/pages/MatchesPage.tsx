import { countdownLabel, isClosed, toDisplayDate } from '../lib/time'
import type { Match, Question } from '../lib/types'

export type MatchFilter = 'all' | 'active' | 'upcoming' | 'past'

interface MatchesPageProps {
  matches: Match[]
  selectedMatchId: number | null
  selectedMatch: Match | null
  questions: Question[]
  activeFilter: MatchFilter
  questionSelections: Record<string, string>
  resolverSelections: Record<string, string>
  onFilterChange: (nextFilter: MatchFilter) => void
  onSelectMatch: (matchId: number) => void
  onSaveSelection: (question: Question, selectedOptionId: string) => Promise<void>
  onResolveQuestion: (question: Question) => Promise<void>
  onResolverChange: (questionId: string, selectedOptionId: string) => void
}

export function MatchesPage({
  matches,
  selectedMatchId,
  selectedMatch,
  questions,
  activeFilter,
  questionSelections,
  resolverSelections,
  onFilterChange,
  onSelectMatch,
  onSaveSelection,
  onResolveQuestion,
  onResolverChange,
}: MatchesPageProps) {
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
            const closeLabel = countdownLabel(match.startsAtIst)
            const isActive = selectedMatchId === match.id
            return (
              <button
                key={match.id}
                type="button"
                className={isActive ? 'match-card active' : 'match-card'}
                onClick={() => onSelectMatch(match.id)}
              >
                <div className="match-card-head">
                  <span>
                    {match.homeTeamCode} vs {match.awayTeamCode}
                  </span>
                  <strong>50 credits</strong>
                </div>
                <p>{match.name}</p>
                <small>
                  {toDisplayDate(match.startsAtIst)} | {closeLabel}
                </small>
              </button>
            )
          })}
        </div>
      </article>

      <article className="panel">
        <h2>{selectedMatch ? selectedMatch.name : 'Select a match'}</h2>
        {selectedMatch ? (
          <p className="subtle">
            {selectedMatch.groundName}, {selectedMatch.city} | Starts{' '}
            {toDisplayDate(selectedMatch.startsAtIst)}
          </p>
        ) : null}

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
                <div className="resolver-row">
                  <select
                    value={resolverSelections[question.id] ?? ''}
                    onChange={(event) => onResolverChange(question.id, event.target.value)}
                  >
                    <option value="">Dev resolve: select correct option</option>
                    {question.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => void onResolveQuestion(question)}>
                    Resolve
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </article>
    </section>
  )
}
