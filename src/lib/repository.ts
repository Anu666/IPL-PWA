import { api } from './api'
import { getMappedMatches } from './mappers'
import type { Answer, LeaderboardRow, Question, UserHistoryEntry } from './types'

export const repository = {
  getMatches: async () => getMappedMatches(),

  getQuestionsByMatch: async (matchId: string): Promise<Question[]> => {
    const matches = getMappedMatches()
    const match = matches.find((m) => m.id === matchId)
    const rawQuestions = await api.questions.getByMatch(matchId)
    const closesAtIst = match?.matchCommenceStartDate ?? new Date().toISOString()
    return rawQuestions
      .map((q) => ({ ...q, closesAtIst }))
      .sort((a, b) => a.sequence - b.sequence)
  },

  getUserAnswer: async (matchId: string, userId: string) => {
    try {
      return await api.userAnswers.getByMatchAndUser(matchId, userId)
    } catch {
      return null
    }
  },

  saveUserAnswer: async (
    matchId: string,
    userId: string,
    answers: Answer[],
    existingId?: string,
  ) => {
    if (existingId) {
      return api.userAnswers.update({ id: existingId, matchId, userId, answers })
    }
    return api.userAnswers.create({ matchId, userId, answers })
  },

  getUserHistory: async (_userId: string): Promise<UserHistoryEntry[]> => [],

  getLeaderboard: async (): Promise<LeaderboardRow[]> => [],
}
