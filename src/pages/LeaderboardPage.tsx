import type { LeaderboardRow } from '../lib/types'

interface LeaderboardPageProps {
  rows: LeaderboardRow[]
}

export function LeaderboardPage({ rows }: LeaderboardPageProps) {
  return (
    <section className="panel">
      <h2>Leaderboard</h2>
      <div className="history-table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>User</th>
              <th>Credits</th>
              <th>Wins</th>
              <th>Losses</th>
              <th>Penalties</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.userId}>
                <td>#{row.rank}</td>
                <td>{row.userName}</td>
                <td>{row.currentCredits}</td>
                <td>{row.wins}</td>
                <td>{row.losses}</td>
                <td>{row.penalized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
