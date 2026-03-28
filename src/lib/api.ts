import type { Answer, LeaderboardEntry, MatchStatusRecord, Question, Transaction, UserAnswer } from './types'

// const BASE_URL = 'https://iplgaming20260322122951-axd9czg3bzewdeez.centralus-01.azurewebsites.net'
const BASE_URL = 'https://localhost:44331'
const STORAGE_KEY = 'ipl-api-key'

export const getApiKey = () => localStorage.getItem(STORAGE_KEY)
export const setApiKey = (key: string) => localStorage.setItem(STORAGE_KEY, key)
export const clearApiKey = () => localStorage.removeItem(STORAGE_KEY)

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const key = getApiKey()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'X-Api-Key': key } : {}),
      ...(options.headers as Record<string, string> | undefined ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`[${res.status}] ${text}`)
  }
  return res.json() as Promise<T>
}

interface MeResponse {
  id: string
  name: string
  email: string
  phoneNumber: string
  role: number
  credits: number
  createdDate: string
  isActive: boolean
}

export type ApiUser = MeResponse

interface ApiQuestion {
  id: string
  matchId: string
  questionText: string
  options: { id: number; optionText: string }[]
  credits: number
  sequence: number
  correctOptionId: number | null
}

interface MatchStatusResponse {
  matchId: string
  status: number
}

export const api = {
  matchStatuses: {
    getAll: () => request<MatchStatusResponse[]>('/api/matchstatus/GetAllMatchStatuses'),
    getByMatchId: (matchId: string) =>
      request<MatchStatusRecord>(`/api/matchstatus/GetMatchStatusByMatchId/${matchId}`),
  },
  users: {
    getMe: () => request<MeResponse>('/api/users/me'),
    getCredits: async () => {
      const me = await request<MeResponse>('/api/users/me')
      return me.credits
    },
  },
  questions: {
    getByMatch: (matchId: string) =>
      request<ApiQuestion[]>(`/api/questions/GetQuestionsByMatchId/${matchId}`),
  },
  transactions: {
    getMyTransactions: () => request<Transaction[]>('/api/transactions/GetMyTransactions'),
  },
  leaderboard: {
    get: () => request<LeaderboardEntry[]>('/api/leaderboard/GetLeaderboard'),
  },
  userAnswers: {
    getByMatchAndUser: (matchId: string, userId: string) =>
      request<UserAnswer>(
        `/api/useranswers/GetUserAnswerByMatchAndUser/${matchId}/${userId}`,
      ),
    create: (body: { matchId: string; userId: string; answers: Answer[] }) =>
      request<UserAnswer>('/api/useranswers/CreateUserAnswer', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (body: {
      id: string
      matchId: string
      userId: string
      answers: Answer[]
    }) =>
      request<UserAnswer>('/api/useranswers/UpdateUserAnswer', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
  },
}

export type { Question }

