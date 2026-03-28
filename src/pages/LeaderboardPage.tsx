import type { LeaderboardEntry } from '../lib/types'

interface LeaderboardPageProps {
  rows: LeaderboardEntry[]
  currentUserId: string | null
}

export function LeaderboardPage({ rows, currentUserId }: LeaderboardPageProps) {
  if (rows.length === 0) {
    return (
      <section className="panel">
        <h2>Leaderboard</h2>
        <p className="subtle">No completed matches yet.</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Leaderboard</h2>
      <div className="history-table-wrap">
        <table className="history-table history-table--lb">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>P&amp;L</th>
              <th>✅ Correct</th>
              <th>❌ Wrong</th>
              <th>⏭ Skipped</th>
              <th>🚫 Voided</th>
              <th>Win Rate</th>
              <th>Matches</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isMe = row.userId === currentUserId
              const pnlSign = row.totalCreditChange >= 0 ? '+' : ''
              return (
                <tr key={row.userId} className={isMe ? 'lb-row--me' : undefined}>
                  <td>#{row.rank}</td>
                  <td>{isMe ? <strong>{row.userName}</strong> : row.userName}</td>
                  <td style={{ color: row.totalCreditChange >= 0 ? 'var(--color-win, #22c55e)' : 'var(--color-loss, #ef4444)', fontWeight: 600 }}>
                    {pnlSign}{row.totalCreditChange}
                  </td>
                  <td>{row.correctPredictions}</td>
                  <td>{row.wrongPredictions}</td>
                  <td>{row.unansweredQuestions}</td>
                  <td>{row.voidedQuestions}</td>
                  <td>{row.winRate.toFixed(1)}%</td>
                  <td>{row.matchesPlayed}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
