import { useState } from 'react'
import type { ApiUser } from '../lib/api'

interface UserDetailsPageProps {
  user: ApiUser | null
  currentCredits: number
  wins: number
  losses: number
  penalized: number
  onRefreshCredits: () => Promise<void>
  onOpenHistory: () => void
}

export function UserDetailsPage({
  user,
  currentCredits,
  wins,
  losses,
  penalized,
  onRefreshCredits,
  onOpenHistory,
}: UserDetailsPageProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshError(null)
    try {
      await onRefreshCredits()
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : 'Failed to refresh')
    } finally {
      setRefreshing(false)
    }
  }

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
              <p className="subtle">Email</p>
              <strong style={{ fontSize: '0.88rem', wordBreak: 'break-all' }}>{user.email}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Phone</p>
              <strong>{user.phoneNumber || '—'}</strong>
            </div>
            <div className="user-stat-card">
              <p className="subtle">Joined</p>
              <strong>{new Date(user.createdDate).toLocaleDateString('en-IN')}</strong>
            </div>
          </div>

          <h3 className="user-section-title">Credits</h3>
          <div className="user-credits-row">
            <div className="user-stat-card" style={{ flex: 1 }}>
              <p className="subtle">Current Credits</p>
              <strong style={{ fontSize: '1.5rem', color: 'var(--sun)' }}>{currentCredits}</strong>
            </div>
            <div className="user-credits-refresh">
              <button
                type="button"
                className="tab"
                disabled={refreshing}
                onClick={() => void handleRefresh()}
                aria-label="Refresh credits"
              >
                {refreshing ? '…' : '↻'} Refresh
              </button>
              {refreshError !== null && (
                <p style={{ color: 'var(--rose)', fontSize: '0.82rem', margin: '0.4rem 0 0' }}>
                  {refreshError}
                </p>
              )}
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
