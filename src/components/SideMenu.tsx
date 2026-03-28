export type AppScreen =
  | 'home'
  | 'matches'
  | 'leaderboard'
  | 'credits'
  | 'userDetails'
  | 'historyHidden'

interface SideMenuProps {
  isOpen: boolean
  activeScreen: AppScreen
  onNavigate: (screen: Exclude<AppScreen, 'historyHidden'>) => void
  onClose: () => void
}

const MENU_ITEMS: Array<{ key: Exclude<AppScreen, 'historyHidden'>; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'matches', label: 'Matches' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'credits', label: 'Credits' },
  { key: 'userDetails', label: 'User Details' },
]

export function SideMenu({
  isOpen,
  activeScreen,
  onNavigate,
  onClose,
}: SideMenuProps) {
  return (
    <>
      <aside className={`side-menu ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <div className="side-menu-head">
          <p className="eyebrow">Navigation</p>
          <button type="button" className="side-menu-close" onClick={onClose}>
            Close
          </button>
        </div>
        <nav className="side-menu-nav" aria-label="Main menu">
          {MENU_ITEMS.map((item) => {
            const isActive = activeScreen === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={isActive ? 'side-menu-link active' : 'side-menu-link'}
                onClick={() => {
                  onNavigate(item.key)
                  onClose()
                }}
              >
                {item.label}
              </button>
            )
          })}
        </nav>
      </aside>
      {isOpen ? <button type="button" className="side-menu-backdrop" onClick={onClose} /> : null}
    </>
  )
}
