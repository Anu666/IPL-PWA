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
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <h1 className="topbar-title">IPL Gaming</h1>
      </div>
      <div className="topbar-right">
        {currentUser ? (
          <div className="credit-pill">
            <div className="credit-pill-text">
              <span>{currentUser.name}</span>
              <strong style={{ color: 'var(--sun)' }}>{currentCredits} credits</strong>
            </div>
            <button
              type="button"
              className="refresh-btn"
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
