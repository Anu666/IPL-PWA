import type { UserProfile } from '../lib/types'

interface UserDetailsPageProps {
  user: UserProfile | null
  currentCredits: number
  wins: number
  losses: number
  penalized: number
  onOpenHistory: () => void
}

export function UserDetailsPage({
  user,
  currentCredits,
  wins,
  losses,
  penalized,
  onOpenHistory,
}: UserDetailsPageProps) {
  return (
    <section className="panel user-panel">
      <h2>User Details</h2>
      {user ? (
        <>
          <div className="user-details-grid">
            <div className="user-stat-card">
              <p className="subtle">Name</p>
              <strong>{user.name}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Joined</p>
              <strong>{new Date(user.createdAt).toLocaleDateString('en-IN')}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Current Credits</p>
              <strong>{currentCredits}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Starting Credits</p>
              <strong>{user.startingCredits}</strong>
            </div>
          </div>

          <h3 className="user-section-title">Performance</h3>
          <div className="user-details-grid">
            <div className="user-stat-card">
              <p className="subtle">Wins</p>
              <strong>{wins}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Losses</p>
              <strong>{losses}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Penalties</p>
              <strong>{penalized}</strong>
            </div>
          </div>

          <button type="button" className="tab user-history-btn" onClick={onOpenHistory}>
            Open My Picks History
          </button>
        </>
      ) : (
        <p className="subtle">No user profile available.</p>
      )}
    </section>
  )
}
