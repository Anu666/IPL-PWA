import styles from './SideMenu.module.css'

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
      <aside className={`${styles.sideMenu} ${isOpen ? styles.open : ''}`} aria-hidden={!isOpen}>
        <div className={styles.sideMenuHead}>
          <p className="eyebrow">Navigation</p>
          <button type="button" className={styles.sideMenuClose} onClick={onClose}>
            Close
          </button>
        </div>
        <nav className={styles.sideMenuNav} aria-label="Main menu">
          {MENU_ITEMS.map((item) => {
            const isActive = activeScreen === item.key
            return (
              <button
                key={item.key}
                type="button"
                className={`${styles.sideMenuLink}${isActive ? ' ' + styles.active : ''}`}
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
      {isOpen ? <button type="button" className={styles.sideMenuBackdrop} onClick={onClose} /> : null}
    </>
  )
}
