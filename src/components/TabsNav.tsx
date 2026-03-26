export type AppTab = 'matches' | 'history' | 'leaderboard'

interface TabsNavProps {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

export function TabsNav({ activeTab, onTabChange }: TabsNavProps) {
  return (
    <nav className="tabs" aria-label="Main sections">
      <button
        type="button"
        className={activeTab === 'matches' ? 'tab active' : 'tab'}
        onClick={() => onTabChange('matches')}
      >
        Matches
      </button>
      <button
        type="button"
        className={activeTab === 'history' ? 'tab active' : 'tab'}
        onClick={() => onTabChange('history')}
      >
        My Picks
      </button>
      <button
        type="button"
        className={activeTab === 'leaderboard' ? 'tab active' : 'tab'}
        onClick={() => onTabChange('leaderboard')}
      >
        Leaderboard
      </button>
    </nav>
  )
}
