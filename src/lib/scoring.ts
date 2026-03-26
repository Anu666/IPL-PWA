import type { PickEvaluation, Prediction, Question, QuestionResult, UserProfile } from './types'

interface EvaluateQuestionInput {
  question: Question
  predictions: Prediction[]
  result: QuestionResult | undefined
  users: UserProfile[]
  userId: string
  isClosed: boolean
}

const EMPTY_EVALUATION: PickEvaluation = {
  questionId: '',
  status: 'open',
  deltaCredits: 0,
  note: 'Question is still open.',
}

export const evaluateQuestionForUser = ({
  question,
  predictions,
  result,
  users,
  userId,
  isClosed,
}: EvaluateQuestionInput): PickEvaluation => {
  const currentPrediction = predictions.find((item) => item.userId === userId)
  const userCount = users.length

  if (!isClosed) {
    return {
      ...EMPTY_EVALUATION,
      questionId: question.id,
    }
  }

  if (!result) {
    if (!currentPrediction) {
      return {
        questionId: question.id,
        status: 'penalized',
        deltaCredits: -question.creditValue,
        note: 'No pick submitted before close time.',
      }
    }

    return {
      questionId: question.id,
      status: 'locked_pending',
      deltaCredits: 0,
      note: 'Pick locked. Waiting for result.',
    }
  }

  const winners = predictions.filter(
    (item) => item.selectedOptionId === result.correctOptionId,
  )
  const losersByWrongPick = predictions.filter(
    (item) => item.selectedOptionId !== result.correctOptionId,
  )

  const unansweredCount = Math.max(userCount - predictions.length, 0)
  const losersPool =
    (losersByWrongPick.length + unansweredCount) * question.creditValue

  if (winners.length > 0) {
    const share = Math.floor(losersPool / winners.length)

    if (!currentPrediction) {
      return {
        questionId: question.id,
        status: 'penalized',
        deltaCredits: -question.creditValue,
        note: 'No pick submitted before close time.',
      }
    }

    if (currentPrediction.selectedOptionId === result.correctOptionId) {
      return {
        questionId: question.id,
        status: 'won',
        deltaCredits: share,
        note: `Correct pick. Won ${share} credits from losers pool.`,
      }
    }

    return {
      questionId: question.id,
      status: 'lost',
      deltaCredits: -question.creditValue,
      note: 'Incorrect pick.',
    }
  }

  if (!currentPrediction) {
    return {
      questionId: question.id,
      status: 'penalized',
      deltaCredits: -question.creditValue,
      note: 'No pick submitted before close time.',
    }
  }

  const participants = predictions.length
  const refundShare =
    participants > 0 ? Math.floor(losersPool / participants) : 0
  const delta = -question.creditValue + refundShare

  if (delta >= 0) {
    return {
      questionId: question.id,
      status: 'lost',
      deltaCredits: delta,
      note: 'No correct picks. Equal refund applied to participants.',
    }
  }

  return {
    questionId: question.id,
    status: 'lost',
    deltaCredits: delta,
    note: 'No correct picks. Partial refund applied.',
  }
}
