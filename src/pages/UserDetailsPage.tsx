import type { ApiUser } from '../lib/api'

interface UserDetailsPageProps {
  user: ApiUser | null
  currentCredits: number
}

export function UserDetailsPage({
  user,
  currentCredits,
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
          <div className="user-stat-card">
            <p className="subtle">Current Credits</p>
            <strong style={{ fontSize: '1.5rem', color: 'var(--sun)' }}>{currentCredits}</strong>
          </div>



        </>
      ) : (
        <p className="subtle">No user profile available.</p>
      )}
    </section>
  )
}
