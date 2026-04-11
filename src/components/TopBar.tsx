import styles from './TopBar.module.css'

interface TopBarProps {
  currentUser: { id: string; name: string } | null
  currentCredits: number
  onMenuClick: () => void
  onRefreshCredits: () => Promise<void>
}

export function TopBar({
  currentUser,
  currentCredits,
  onMenuClick,
  onRefreshCredits,
}: TopBarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <button type="button" className={styles.menuBtn} onClick={onMenuClick} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <h1 className={styles.topbarTitle}>IPL Gaming</h1>
      </div>
      <div className={styles.topbarRight}>
        {currentUser ? (
          <div className={styles.creditPill}>
            <div className={styles.creditPillText}>
              <span>{currentUser.name}</span>
              <strong style={{ color: 'var(--sun)' }}>{currentCredits.toFixed(2)} credits</strong>
            </div>
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={() => void onRefreshCredits()}
              aria-label="Refresh credits"
            >
              ↻
            </button>
          </div>
        ) : null}
      </div>
    </header>
  )
}
