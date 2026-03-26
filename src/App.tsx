import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { ApiKeyGate } from './components/ApiKeyGate'
import { SideMenu, type AppScreen } from './components/SideMenu'
import { TopBar } from './components/TopBar'
import { api, clearApiKey, getApiKey, type ApiUser } from './lib/api'
import { repository } from './lib/repository'
import { isClosed } from './lib/time'
import type {
  Answer,
  LeaderboardRow,
  Match,
  Question,
  UserHistoryEntry,
} from './lib/types'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { MatchesPage, type MatchFilter } from './pages/MatchesPage'
import { UserDetailsPage } from './pages/UserDetailsPage'

const classifyMatch = (match: Match, now: Date) => {
  const startMs = new Date(match.matchCommenceStartDate).getTime()
  const nowMs = now.getTime()
  const endMs = startMs + 4 * 60 * 60 * 1000

  if (nowMs < startMs) return 'upcoming' as const
  if (nowMs < endMs) return 'active' as const
  return 'past' as const
}

const isSameIstDate = (isoLike: string, now: Date) => {
  const targetDate = new Date(isoLike).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })
  const nowDate = now.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  })

  return targetDate === nowDate
}

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isLoading, setIsLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedHomeMatchId, setSelectedHomeMatchId] = useState<string | null>(null)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [questions, setQuestions] = useState<Question[]>([])
  const [homeQuestions, setHomeQuestions] = useState<Question[]>([])
  const [questionSelections, setQuestionSelections] = useState<Record<string, number>>(
    {},
  )
  const [userAnswerIds, setUserAnswerIds] = useState<Record<string, string>>({})
  const [history, setHistory] = useState<UserHistoryEntry[]>([])
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([])
  const [currentCredits, setCurrentCredits] = useState(0)
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null)
  const [clockTick, setClockTick] = useState(0)

  // ── Auth state ────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getApiKey())
  const [authValidating, setAuthValidating] = useState(() => !!getApiKey())
  const [authError, setAuthError] = useState<string | null>(null)

  const now = useMemo(() => new Date(), [clockTick])

  const todayMatches = useMemo(() => {
    return matches
      .filter((match) => isSameIstDate(match.matchCommenceStartDate, now))
      .sort(
        (a, b) =>
          new Date(a.matchCommenceStartDate).getTime() - new Date(b.matchCommenceStartDate).getTime(),
      )
  }, [matches, now])

  const homeMatches = useMemo(() => {
    if (todayMatches.length > 0) {
      return todayMatches
    }

    const nearestUpcoming = [...matches]
      .filter((match) => new Date(match.matchCommenceStartDate).getTime() > now.getTime())
      .sort(
        (a, b) =>
          new Date(a.matchCommenceStartDate).getTime() - new Date(b.matchCommenceStartDate).getTime(),
      )[0]

    return nearestUpcoming ? [nearestUpcoming] : []
  }, [matches, now, todayMatches])

  const filteredMatches = useMemo(() => {
    if (matchFilter === 'all') {
      return matches
    }

    return matches.filter((match) => {
      const derived = classifyMatch(match, now)

      if (matchFilter === 'active') {
        return derived === 'active'
      }

      if (matchFilter === 'upcoming') {
        return derived === 'upcoming'
      }

      return derived === 'past'
    })
  }, [matches, matchFilter, now])

  const selectedMatch = useMemo(
    () => filteredMatches.find((item) => item.id === selectedMatchId) ?? null,
    [filteredMatches, selectedMatchId],
  )

  const selectedHomeMatch = useMemo(
    () => homeMatches.find((item) => item.id === selectedHomeMatchId) ?? null,
    [homeMatches, selectedHomeMatchId],
  )

  const refreshGameData = async () => {
    // Profile + credits come from the live API
    const apiUser = await api.users.getMe()
    setCurrentUser(apiUser)
    setCurrentCredits(apiUser.credits)

    const allMatches = await repository.getMatches()
    const firstMatchId = allMatches[0]?.id ?? null

    setMatches(allMatches)
    setSelectedMatchId((prev) => prev ?? firstMatchId)
    setSelectedHomeMatchId((prev) => prev ?? firstMatchId)

    const nextHistory = await repository.getUserHistory(apiUser.id)
    const nextLeaderboard = await repository.getLeaderboard()

    setHistory(nextHistory)
    setLeaderboardRows(nextLeaderboard)
  }

  const refreshCredits = async () => {
    const credits = await api.users.getCredits()
    setCurrentCredits(credits)
  }

  const refreshSelectedMatchQuestions = async (matchId: string | null) => {
    if (!matchId || !currentUser) {
      setQuestions([])
      return
    }

    const [nextQuestions, existingAnswer] = await Promise.all([
      repository.getQuestionsByMatch(matchId),
      repository.getUserAnswer(matchId, currentUser.id),
    ])
    setQuestions(nextQuestions)

    if (existingAnswer) {
      setUserAnswerIds((prev) => ({ ...prev, [matchId]: existingAnswer.id }))
      setQuestionSelections((prev) => {
        const next = { ...prev }
        for (const a of existingAnswer.answers) {
          next[a.questionId] = a.selectedOption
        }
        return next
      })
    }
  }

  const refreshHomeMatchQuestions = async (matchId: string | null) => {
    if (!matchId || !currentUser) {
      setHomeQuestions([])
      return
    }

    const [nextQuestions, existingAnswer] = await Promise.all([
      repository.getQuestionsByMatch(matchId),
      repository.getUserAnswer(matchId, currentUser.id),
    ])
    setHomeQuestions(nextQuestions)

    if (existingAnswer) {
      setUserAnswerIds((prev) => ({ ...prev, [matchId]: existingAnswer.id }))
      setQuestionSelections((prev) => {
        const next = { ...prev }
        for (const a of existingAnswer.answers) {
          next[a.questionId] = a.selectedOption
        }
        return next
      })
    }
  }

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

  // Validate stored key on mount / when auth state changes
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthValidating(false)
      return
    }
    setAuthValidating(true)
    setAuthError(null)
    api.users.getMe()
      .then(() => { /* valid */ })
      .catch((err: unknown) => {
        const is401 = err instanceof Error && err.message.startsWith('[401]')
        if (is401) {
          clearApiKey()
          setIsAuthenticated(false)
        } else {
          setAuthError(err instanceof Error ? err.message : 'Unknown error')
        }
      })
      .finally(() => setAuthValidating(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    void (async () => {
      setIsLoading(true)
      await refreshGameData()
      setIsLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  useEffect(() => {
    void refreshSelectedMatchQuestions(selectedMatchId)
  }, [selectedMatchId])

  useEffect(() => {
    void refreshHomeMatchQuestions(selectedHomeMatchId)
  }, [selectedHomeMatchId])

  useEffect(() => {
    if (filteredMatches.length === 0) {
      setSelectedMatchId(null)
      return
    }

    const isVisible = filteredMatches.some((match) => match.id === selectedMatchId)
    if (!isVisible) {
      setSelectedMatchId(filteredMatches[0].id)
    }
  }, [filteredMatches, selectedMatchId])

  useEffect(() => {
    if (homeMatches.length === 0) {
      setSelectedHomeMatchId(null)
      return
    }

    const isVisible = homeMatches.some((match) => match.id === selectedHomeMatchId)
    if (!isVisible) {
      setSelectedHomeMatchId(homeMatches[0].id)
    }
  }, [homeMatches, selectedHomeMatchId])

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

  useEffect(() => {
    const id = window.setInterval(() => {
      setClockTick((prev) => prev + 1)
    }, 30000)

    return () => window.clearInterval(id)
  }, [])



  const saveSelection = async (question: Question, selectedOptionId: number) => {
    if (!currentUser || isClosed(question.closesAtIst)) {
      return
    }

    const nextSelections = { ...questionSelections, [question.id]: selectedOptionId }
    setQuestionSelections(nextSelections)

    const isHomeMatch = question.matchId === selectedHomeMatchId
    const matchQs = isHomeMatch ? homeQuestions : questions
    const answers: Answer[] = matchQs
      .filter((q) => nextSelections[q.id] !== undefined)
      .map((q) => ({ questionId: q.id, selectedOption: nextSelections[q.id] }))

    const existingId = userAnswerIds[question.matchId]
    const saved = await repository.saveUserAnswer(
      question.matchId,
      currentUser.id,
      answers,
      existingId,
    )

    if (!existingId) {
      setUserAnswerIds((prev) => ({ ...prev, [question.matchId]: saved.id }))
    }

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

  return (
    <main className="app-shell" key={clockTick}>
      <SideMenu
        isOpen={isMenuOpen}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onClose={() => setIsMenuOpen(false)}
      />

      <TopBar
        currentUser={currentUser}
        currentCredits={currentCredits}
        onMenuClick={() => setIsMenuOpen(true)}
        onRefreshCredits={refreshCredits}
      />

      {isOffline ? (
        <div className="offline-banner">Offline mode active</div>
      ) : null}

      {isLoading ? <section className="panel">Loading game data...</section> : null}

      {!isLoading && activeScreen === 'home' ? (
        <HomePage
          todayOrUpcomingMatches={homeMatches}
          selectedHomeMatchId={selectedHomeMatchId}
          selectedHomeMatch={selectedHomeMatch}
          questions={homeQuestions}
          questionSelections={questionSelections}
          onSelectHomeMatch={setSelectedHomeMatchId}
          onSaveSelection={saveSelection}
        />
      ) : null}

      {!isLoading && activeScreen === 'matches' ? (
        <MatchesPage
          matches={filteredMatches}
          selectedMatchId={selectedMatchId}
          selectedMatch={selectedMatch}
          questions={questions}
          activeFilter={matchFilter}
          questionSelections={questionSelections}
          onFilterChange={setMatchFilter}
          onSelectMatch={setSelectedMatchId}
          onSaveSelection={saveSelection}
        />
      ) : null}

      {!isLoading && activeScreen === 'leaderboard' ? (
        <LeaderboardPage rows={leaderboardRows} />
      ) : null}

      {!isLoading && activeScreen === 'userDetails' ? (
        <UserDetailsPage
          user={currentUser}
          currentCredits={currentCredits}
        />
      ) : null}

      {!isLoading && activeScreen === 'historyHidden' ? (
        <HistoryPage history={history} />
      ) : null}
    </main>
  )
}

export default App
