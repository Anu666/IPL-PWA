import type { UserHistoryEntry } from '../lib/types'

interface HistoryPageProps {
  history: UserHistoryEntry[]
}

export function HistoryPage({ history }: HistoryPageProps) {
  return (
    <section className="panel">
      <h2>My Picks History</h2>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Match</th>
              <th>Question</th>
              <th>Answer</th>
              <th>Status</th>
              <th>Credits</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={`${item.matchId}-${item.questionText}`}>
                <td>{item.matchName}</td>
                <td>{item.questionText}</td>
                <td>{item.selectedOptionLabel}</td>
                <td>
                  <span className={`pill ${item.status}`}>{item.status}</span>
                </td>
                <td>{item.deltaCredits > 0 ? `+${item.deltaCredits}` : item.deltaCredits}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
