import { useEffect, useState } from 'react'
import './App.css'
import { ApiKeyGate } from './components/ApiKeyGate'
import { SideMenu, type AppScreen } from './components/SideMenu'
import { TopBar } from './components/TopBar'
import { api, clearApiKey, getApiKey, type ApiUser } from './lib/api'
import { HomePage } from './pages/home/HomePage'
import { MatchesPage } from './pages/matches/MatchesPage'
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage'
import { CreditsPage } from './pages/credits/CreditsPage'
import { UserDetailsPage } from './pages/profile/UserDetailsPage'

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [activeScreen, setActiveScreen] = useState<AppScreen>(() => {
    const saved = localStorage.getItem('pwa-screen')
    const valid: AppScreen[] = ['home', 'matches', 'leaderboard', 'credits', 'userDetails', 'historyHidden']
    return (valid.includes(saved as AppScreen) ? saved : 'home') as AppScreen
  })
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
  const [currentCredits, setCurrentCredits] = useState(0)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getApiKey())
  const [authValidating, setAuthValidating] = useState(() => !!getApiKey())
  const [authError, setAuthError] = useState<string | null>(null)

  // Lazy-mount: track which screens have ever been visited.
  // A page mounts the first time it becomes active, then stays mounted
  // (hidden) so its data is preserved without re-fetching on tab switch.
  const [mountedScreens, setMountedScreens] = useState<Set<AppScreen>>(
    () => new Set([activeScreen]),
  )

  useEffect(() => {
    localStorage.setItem('pwa-screen', activeScreen)
  }, [activeScreen])

  useEffect(() => {
    const onOffline = () => setIsOffline(true)
    const onOnline = () => setIsOffline(false)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [])

  useEffect(() => {
    if (!isMenuOpen) {
      document.body.classList.remove('menu-open')
      return
    }
    document.body.classList.add('menu-open')
    return () => {
      document.body.classList.remove('menu-open')
    }
  }, [isMenuOpen])

  // Validate key + load profile in one effect (no double getMe call)
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthValidating(false)
      setCurrentUser(null)
      setCurrentCredits(0)
      return
    }
    setAuthValidating(true)
    setAuthError(null)
    api.users.getMe()
      .then((user) => {
        setCurrentUser(user)
        setCurrentCredits(user.credits)
        setAuthValidating(false)
      })
      .catch((err: unknown) => {
        const is401 = err instanceof Error && err.message.startsWith('[401]')
        if (is401) {
          clearApiKey()
          setIsAuthenticated(false)
        } else {
          setAuthError(err instanceof Error ? err.message : 'Unknown error')
        }
        setAuthValidating(false)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const refreshCredits = async () => {
    const credits = await api.users.getCredits()
    setCurrentCredits(credits)
  }

  // ── Auth gates ────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <ApiKeyGate onAuthenticated={() => setIsAuthenticated(true)} />
  }

  if (authValidating) {
    return (
      <div className="gate-shell">
        <p className="gate-shell-msg">Verifying your access…</p>
      </div>
    )
  }

  if (authError !== null) {
    return (
      <div className="gate-shell">
        <div className="gate-card">
          <div className="gate-brand">
            <p className="eyebrow">IPL Questions Game</p>
            <h1 className="gate-title">IPL Gaming Arena</h1>
          </div>
          <p style={{ fontSize: '2rem', textAlign: 'center', margin: 0 }}>⚠️</p>
          <p className="gate-subtitle" style={{ color: 'var(--rose)', textAlign: 'center' }}>
            {authError}
          </p>
          <div className="gate-error-actions">
            <button
              className="gate-btn gate-btn--secondary"
              type="button"
              onClick={() => { clearApiKey(); setIsAuthenticated(false); setAuthError(null) }}
            >
              Sign out
            </button>
            <button
              className="gate-btn"
              type="button"
              onClick={() => { setAuthError(null); setIsAuthenticated(true) }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const userId = currentUser?.id ?? null

  const navigateTo = (screen: Exclude<AppScreen, 'historyHidden'>) => {
    setMountedScreens((prev) => new Set([...prev, screen]))
    setActiveScreen(screen)
  }

  return (
    <main className="app-shell">
      <SideMenu
        isOpen={isMenuOpen}
        activeScreen={activeScreen}
        onNavigate={navigateTo}
        onClose={() => setIsMenuOpen(false)}
      />

      <TopBar
        currentUser={currentUser}
        currentCredits={currentCredits}
        onMenuClick={() => setIsMenuOpen(true)}
        onRefreshCredits={refreshCredits}
      />

      {isOffline ? <div className="offline-banner">Offline mode active</div> : null}

      {mountedScreens.has('home') && (
        <div hidden={activeScreen !== 'home'}>
          <HomePage userId={userId} />
        </div>
      )}

      {mountedScreens.has('matches') && (
        <div hidden={activeScreen !== 'matches'}>
          <MatchesPage userId={userId} />
        </div>
      )}

      {mountedScreens.has('leaderboard') && (
        <div hidden={activeScreen !== 'leaderboard'}>
          <LeaderboardPage userId={userId} />
        </div>
      )}

      {mountedScreens.has('credits') && (
        <div hidden={activeScreen !== 'credits'}>
          <CreditsPage currentCredits={currentCredits} />
        </div>
      )}

      {mountedScreens.has('userDetails') && (
        <div hidden={activeScreen !== 'userDetails'}>
          <UserDetailsPage user={currentUser} currentCredits={currentCredits} />
        </div>
      )}
    </main>
  )
}

export default App
