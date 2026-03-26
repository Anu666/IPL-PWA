import predictionsSeed from '../assets/json/predictions.json'
import questionSeed from '../assets/json/questions.json'
import resultsSeed from '../assets/json/results.json'
import usersSeed from '../assets/json/users.json'
import { getMappedMatches } from './mappers'
import { evaluateQuestionForUser } from './scoring'
import { addMinutesToIso, isClosed } from './time'
import type {
  LeaderboardRow,
  PickEvaluation,
  Prediction,
  Question,
  QuestionResult,
  QuestionTemplateRoot,
  UserHistoryEntry,
  UserProfile,
} from './types'

interface PredictionRoot {
  predictions: Prediction[]
}

interface ResultRoot {
  results: QuestionResult[]
}

interface UserRoot {
  users: UserProfile[]
}

const USER_STORE_KEY = 'ipl-temp-users'
const PREDICTION_STORE_KEY = 'ipl-temp-predictions'
const RESULT_STORE_KEY = 'ipl-temp-results'

const templateRoot = questionSeed as QuestionTemplateRoot
const seedUsers = (usersSeed as UserRoot).users
const seedPredictions = (predictionsSeed as PredictionRoot).predictions
const seedResults = (resultsSeed as ResultRoot).results

const getStore = <T>(key: string, fallback: T): T => {
  const stored = localStorage.getItem(key)

  if (!stored) {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }

  try {
    return JSON.parse(stored) as T
  } catch {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
}

const setStore = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const makeQuestionId = (matchId: number, index: number) => `${matchId}-q${index + 1}`

const buildQuestions = (matchId: number, startsAtIst: string): Question[] => {
  return templateRoot.defaultQuestionSet.map((template, index) => {
    const closesAtIst = addMinutesToIso(startsAtIst, templateRoot.closeOffsetMinutes)

    return {
      id: makeQuestionId(matchId, index),
      matchId,
      order: index + 1,
      type: template.type,
      text: template.text,
      options: [],
      creditValue: template.creditValue,
      closesAtIst,
    }
  })
}

const withMatchOptions = (question: Question, matchId: number): Question => {
  const match = getMappedMatches().find((item) => item.id === matchId)

  if (!match) {
    return question
  }

  return {
    ...question,
    options: [
      { id: `${question.id}-home`, label: `${match.homeTeamCode} - ${match.homeTeamName}` },
      { id: `${question.id}-away`, label: `${match.awayTeamCode} - ${match.awayTeamName}` },
    ],
  }
}

export const repository = {
  getUsers: async () => {
    return getStore(USER_STORE_KEY, seedUsers)
  },

  getCurrentUser: async () => {
    const users = await repository.getUsers()
    return users[0]
  },

  getMatches: async () => {
    return getMappedMatches()
  },

  getQuestionsByMatch: async (matchId: number) => {
    const matches = await repository.getMatches()
    const match = matches.find((item) => item.id === matchId)

    if (!match) {
      return []
    }

    const questions = buildQuestions(matchId, match.startsAtIst)
    return questions.map((item) => withMatchOptions(item, matchId))
  },

  getAllPredictions: async () => {
    return getStore(PREDICTION_STORE_KEY, seedPredictions)
  },

  getPredictionsByUser: async (userId: string) => {
    const all = await repository.getAllPredictions()
    return all.filter((item) => item.userId === userId)
  },

  savePrediction: async (input: {
    userId: string
    matchId: number
    questionId: string
    selectedOptionId: string
  }) => {
    const all = await repository.getAllPredictions()
    const existingIndex = all.findIndex(
      (item) => item.userId === input.userId && item.questionId === input.questionId,
    )

    const nowIso = new Date().toISOString()
    const nextPrediction: Prediction = {
      id: existingIndex >= 0 ? all[existingIndex].id : `${input.userId}-${input.questionId}`,
      userId: input.userId,
      matchId: input.matchId,
      questionId: input.questionId,
      selectedOptionId: input.selectedOptionId,
      submittedAt: nowIso,
    }

    if (existingIndex >= 0) {
      all[existingIndex] = nextPrediction
    } else {
      all.push(nextPrediction)
    }

    setStore(PREDICTION_STORE_KEY, all)
    return nextPrediction
  },

  getResults: async () => {
    return getStore(RESULT_STORE_KEY, seedResults)
  },

  resolveQuestion: async (input: {
    matchId: number
    questionId: string
    correctOptionId: string
  }) => {
    const all = await repository.getResults()
    const existingIndex = all.findIndex((item) => item.questionId === input.questionId)

    const nextResult: QuestionResult = {
      id: existingIndex >= 0 ? all[existingIndex].id : `result-${input.questionId}`,
      matchId: input.matchId,
      questionId: input.questionId,
      correctOptionId: input.correctOptionId,
      resolvedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      all[existingIndex] = nextResult
    } else {
      all.push(nextResult)
    }

    setStore(RESULT_STORE_KEY, all)
    return nextResult
  },

  getQuestionEvaluation: async (input: {
    userId: string
    question: Question
  }): Promise<PickEvaluation> => {
    const users = await repository.getUsers()
    const predictions = (await repository.getAllPredictions()).filter(
      (item) => item.questionId === input.question.id,
    )
    const result = (await repository.getResults()).find(
      (item) => item.questionId === input.question.id,
    )

    return evaluateQuestionForUser({
      question: input.question,
      predictions,
      result,
      users,
      userId: input.userId,
      isClosed: isClosed(input.question.closesAtIst),
    })
  },

  getCurrentCredits: async (userId: string) => {
    const user = (await repository.getUsers()).find((item) => item.id === userId)

    if (!user) {
      return 0
    }

    const matches = await repository.getMatches()
    let totalDelta = 0

    for (const match of matches) {
      const questions = await repository.getQuestionsByMatch(match.id)
      for (const question of questions) {
        const evaluation = await repository.getQuestionEvaluation({ userId, question })
        totalDelta += evaluation.deltaCredits
      }
    }

    return user.startingCredits + totalDelta
  },

  getUserHistory: async (userId: string): Promise<UserHistoryEntry[]> => {
    const matches = await repository.getMatches()
    const allPredictions = await repository.getPredictionsByUser(userId)

    const history: UserHistoryEntry[] = []

    for (const match of matches) {
      const questions = await repository.getQuestionsByMatch(match.id)

      for (const question of questions) {
        const prediction = allPredictions.find(
          (item) => item.questionId === question.id && item.userId === userId,
        )
        const selectedOptionLabel =
          question.options.find((item) => item.id === prediction?.selectedOptionId)?.label ??
          'No answer'

        const evaluation = await repository.getQuestionEvaluation({
          userId,
          question,
        })

        history.push({
          matchId: match.id,
          matchName: match.name,
          questionText: question.text,
          selectedOptionLabel,
          status: evaluation.status,
          deltaCredits: evaluation.deltaCredits,
          note: evaluation.note,
          closesAtIst: question.closesAtIst,
        })
      }
    }

    return history.sort((a, b) => {
      return new Date(b.closesAtIst).getTime() - new Date(a.closesAtIst).getTime()
    })
  },

  getLeaderboard: async (): Promise<LeaderboardRow[]> => {
    const users = await repository.getUsers()

    const rows: LeaderboardRow[] = []

    for (const user of users) {
      const history = await repository.getUserHistory(user.id)
      const currentCredits = await repository.getCurrentCredits(user.id)

      const wins = history.filter((item) => item.status === 'won').length
      const losses = history.filter((item) => item.status === 'lost').length
      const penalized = history.filter((item) => item.status === 'penalized').length

      rows.push({
        userId: user.id,
        userName: user.name,
        currentCredits,
        wins,
        losses,
        penalized,
        rank: 0,
      })
    }

    const ranked = rows.sort((a, b) => b.currentCredits - a.currentCredits)

    return ranked.map((row, index) => ({
      ...row,
      rank: index + 1,
    }))
  },

  validateQuestionCredits: async () => {
    const matches = await repository.getMatches()

    const checks = await Promise.all(
      matches.map(async (match) => {
        const questions = await repository.getQuestionsByMatch(match.id)
        const total = questions.reduce((sum, item) => sum + item.creditValue, 0)
        return total === templateRoot.matchCreditCap && questions.length === 5
      }),
    )

    return checks.every(Boolean)
  },
}
