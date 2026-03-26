interface TopBarProps {
  currentUser: { id: string; name: string } | null
  currentCredits: number
  canShowInstallButton: boolean
  isInstalled: boolean
  onInstallClick: () => Promise<void>
  onMenuClick: () => void
}

export function TopBar({
  currentUser,
  currentCredits,
  canShowInstallButton,
  isInstalled,
  onInstallClick,
  onMenuClick,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="menu-btn" onClick={onMenuClick} aria-label="Open menu">
          <span />
          <span />
          <span />
        </button>
        <div>
        <p className="eyebrow">IPL Questions Game</p>
        <h1>IPL Gaming Arena</h1>
        </div>
      </div>
      <div className="topbar-right">
        {currentUser ? (
          <div className="credit-pill">
            <span>{currentUser.name}</span>
            <strong>{currentCredits} credits</strong>
          </div>
        ) : null}
        {canShowInstallButton ? (
          <button
            className="install-btn"
            type="button"
            onClick={() => void onInstallClick()}
            disabled={isInstalled}
          >
            {isInstalled ? 'Installed' : 'Install App'}
          </button>
        ) : null}
      </div>
    </header>
  )
}
