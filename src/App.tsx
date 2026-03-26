import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { SideMenu, type AppScreen } from './components/SideMenu'
import { StatusRow } from './components/StatusRow'
import { TopBar } from './components/TopBar'
import { repository } from './lib/repository'
import { isClosed } from './lib/time'
import type {
  LeaderboardRow,
  Match,
  MatchStatus,
  Question,
  UserHistoryEntry,
  UserProfile,
} from './lib/types'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { LeaderboardPage } from './pages/LeaderboardPage'
import { MatchesPage, type MatchFilter } from './pages/MatchesPage'
import { UserDetailsPage } from './pages/UserDetailsPage'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALL_COOLDOWN_KEY = 'ipl-install-cooldown-until'
const INSTALL_COOLDOWN_DAYS = 3

const classifyMatch = (status: MatchStatus, startsAtIst: string, now: Date) => {
  if (status === 'ongoing') {
    return 'active' as const
  }

  if (status === 'completed') {
    return 'past' as const
  }

  return new Date(startsAtIst).getTime() > now.getTime()
    ? ('upcoming' as const)
    : ('active' as const)
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

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isSafari = () => {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android')
}

const isRunningStandalone = () => {
  const isStandaloneDisplayMode = window.matchMedia(
    '(display-mode: standalone)',
  ).matches
  const isIosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)

  return isStandaloneDisplayMode || isIosStandalone
}

function App() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone())
  const [isInCooldown, setIsInCooldown] = useState(false)
  const [installMessage, setInstallMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [activeScreen, setActiveScreen] = useState<AppScreen>('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [selectedHomeMatchId, setSelectedHomeMatchId] = useState<number | null>(null)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [questions, setQuestions] = useState<Question[]>([])
  const [homeQuestions, setHomeQuestions] = useState<Question[]>([])
  const [questionSelections, setQuestionSelections] = useState<Record<string, string>>(
    {},
  )
  const [resolverSelections, setResolverSelections] = useState<Record<string, string>>(
    {},
  )
  const [history, setHistory] = useState<UserHistoryEntry[]>([])
  const [leaderboardRows, setLeaderboardRows] = useState<LeaderboardRow[]>([])
  const [currentCredits, setCurrentCredits] = useState(0)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [clockTick, setClockTick] = useState(0)

  const isIosSafari = isIos() && isSafari()
  const now = useMemo(() => new Date(), [clockTick])

  const todayMatches = useMemo(() => {
    return matches
      .filter((match) => isSameIstDate(match.startsAtIst, now))
      .sort(
        (a, b) =>
          new Date(a.startsAtIst).getTime() - new Date(b.startsAtIst).getTime(),
      )
  }, [matches, now])

  const homeMatches = useMemo(() => {
    if (todayMatches.length > 0) {
      return todayMatches
    }

    const nearestUpcoming = [...matches]
      .filter((match) => new Date(match.startsAtIst).getTime() > now.getTime())
      .sort(
        (a, b) =>
          new Date(a.startsAtIst).getTime() - new Date(b.startsAtIst).getTime(),
      )[0]

    return nearestUpcoming ? [nearestUpcoming] : []
  }, [matches, now, todayMatches])

  const filteredMatches = useMemo(() => {
    if (matchFilter === 'all') {
      return matches
    }

    return matches.filter((match) => {
      const derived = classifyMatch(match.status, match.startsAtIst, now)

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

  const wins = useMemo(
    () => history.filter((item) => item.status === 'won').length,
    [history],
  )
  const losses = useMemo(
    () => history.filter((item) => item.status === 'lost').length,
    [history],
  )
  const penalized = useMemo(
    () => history.filter((item) => item.status === 'penalized').length,
    [history],
  )

  const refreshGameData = async () => {
    const user = await repository.getCurrentUser()

    if (!user) {
      return
    }

    const allMatches = await repository.getMatches()
    const firstMatchId = allMatches[0]?.id ?? null

    setCurrentUser(user)
    setMatches(allMatches)
    setSelectedMatchId((prev) => prev ?? firstMatchId)
    setSelectedHomeMatchId((prev) => prev ?? firstMatchId)

    const userPredictions = await repository.getPredictionsByUser(user.id)
    setQuestionSelections(
      userPredictions.reduce<Record<string, string>>((acc, item) => {
        acc[item.questionId] = item.selectedOptionId
        return acc
      }, {}),
    )

    const nextHistory = await repository.getUserHistory(user.id)
    const nextLeaderboard = await repository.getLeaderboard()
    const nextCredits = await repository.getCurrentCredits(user.id)

    setHistory(nextHistory)
    setLeaderboardRows(nextLeaderboard)
    setCurrentCredits(nextCredits)
  }

  const refreshSelectedMatchQuestions = async (matchId: number | null) => {
    if (!matchId) {
      setQuestions([])
      return
    }

    const nextQuestions = await repository.getQuestionsByMatch(matchId)
    setQuestions(nextQuestions)
  }

  const refreshHomeMatchQuestions = async (matchId: number | null) => {
    if (!matchId) {
      setHomeQuestions([])
      return
    }

    const nextQuestions = await repository.getQuestionsByMatch(matchId)
    setHomeQuestions(nextQuestions)
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

  useEffect(() => {
    void (async () => {
      setIsLoading(true)
      await refreshGameData()
      setIsLoading(false)
    })()
  }, [])

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

  useEffect(() => {
    const cooldownUntil = Number(localStorage.getItem(INSTALL_COOLDOWN_KEY) ?? '0')
    setIsInCooldown(cooldownUntil > Date.now())

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setInstallMessage('')
    }

    const onAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
      setInstallMessage('App installed successfully.')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const canShowInstallButton = !isInstalled
  const canShowIosHint = !isInstalled && isIosSafari

  const saveSelection = async (question: Question, selectedOptionId: string) => {
    if (!currentUser || isClosed(question.closesAtIst)) {
      return
    }

    setQuestionSelections((prev) => ({
      ...prev,
      [question.id]: selectedOptionId,
    }))

    await repository.savePrediction({
      userId: currentUser.id,
      matchId: question.matchId,
      questionId: question.id,
      selectedOptionId,
    })

    await refreshGameData()
  }

  const resolveQuestion = async (question: Question) => {
    const selectedOptionId = resolverSelections[question.id]

    if (!selectedOptionId) {
      return
    }

    await repository.resolveQuestion({
      matchId: question.matchId,
      questionId: question.id,
      correctOptionId: selectedOptionId,
    })

    await refreshGameData()
  }

  const onInstallClick = async () => {
    if (isInstalled) {
      setInstallMessage('App is already installed.')
      return
    }

    if (isInCooldown) {
      setInstallMessage('Install was recently dismissed. Please try again later.')
      return
    }

    if (!deferredPrompt) {
      setInstallMessage(
        'Install prompt is not available yet. Use browser menu > Install App.',
      )
      return
    }

    try {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice

      if (choice.outcome === 'dismissed') {
        const cooldownUntil =
          Date.now() + INSTALL_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
        localStorage.setItem(INSTALL_COOLDOWN_KEY, String(cooldownUntil))
        setIsInCooldown(true)
        setInstallMessage('Install was dismissed.')
      } else {
        setInstallMessage('Install accepted. Finishing setup...')
      }
    } catch {
      setInstallMessage('Install failed. Please try browser menu > Install App.')
    } finally {
      // appinstalled may not always fire immediately in all browsers
      setTimeout(() => {
        if (isRunningStandalone()) {
          setIsInstalled(true)
          setInstallMessage('App installed successfully.')
        }
      }, 1200)

      setDeferredPrompt(null)
    }
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
        canShowInstallButton={canShowInstallButton}
        isInstalled={isInstalled}
        onInstallClick={onInstallClick}
        onMenuClick={() => setIsMenuOpen(true)}
      />

      <StatusRow
        isOffline={isOffline}
        canShowIosHint={canShowIosHint}
        installMessage={installMessage}
      />

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
          resolverSelections={resolverSelections}
          onFilterChange={setMatchFilter}
          onSelectMatch={setSelectedMatchId}
          onSaveSelection={saveSelection}
          onResolveQuestion={resolveQuestion}
          onResolverChange={(questionId, selectedOptionId) =>
            setResolverSelections((prev) => ({
              ...prev,
              [questionId]: selectedOptionId,
            }))
          }
        />
      ) : null}

      {!isLoading && activeScreen === 'leaderboard' ? (
        <LeaderboardPage rows={leaderboardRows} />
      ) : null}

      {!isLoading && activeScreen === 'userDetails' ? (
        <UserDetailsPage
          user={currentUser}
          currentCredits={currentCredits}
          wins={wins}
          losses={losses}
          penalized={penalized}
          onOpenHistory={() => setActiveScreen('historyHidden')}
        />
      ) : null}

      {!isLoading && activeScreen === 'historyHidden' ? (
        <HistoryPage history={history} />
      ) : null}
    </main>
  )
}

export default App
