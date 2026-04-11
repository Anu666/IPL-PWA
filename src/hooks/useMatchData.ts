import { useState, useEffect, useRef, useCallback } from 'react'
import { repository } from '../lib/repository'
import { isClosed } from '../lib/time'
import type { Answer, Question } from '../lib/types'

export function useMatchData(
  matchId: string | null,
  userId: string | null,
  effectiveStartDate: string,
) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionSelections, setQuestionSelections] = useState<Record<string, number>>({})
  const [userAnswerIds, setUserAnswerIds] = useState<Record<string, string>>({})
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({})
  const savingMatchIds = useRef<Set<string>>(new Set())

  // Refs so saveSelection callback stays stable without stale closures
  const questionsRef = useRef(questions)
  const questionSelectionsRef = useRef(questionSelections)
  const userAnswerIdsRef = useRef(userAnswerIds)
  useEffect(() => { questionsRef.current = questions }, [questions])
  useEffect(() => { questionSelectionsRef.current = questionSelections }, [questionSelections])
  useEffect(() => { userAnswerIdsRef.current = userAnswerIds }, [userAnswerIds])

  useEffect(() => {
    if (!matchId || !userId) {
      setQuestions([])
      return
    }

    let cancelled = false

    void (async () => {
      const [nextQuestions, existingAnswer] = await Promise.all([
        repository.getQuestionsByMatch(matchId, effectiveStartDate),
        repository.getUserAnswer(matchId, userId),
      ])

      if (cancelled) return

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
    })()

    return () => {
      cancelled = true
    }
  }, [matchId, userId, effectiveStartDate])

  const saveSelection = useCallback(
    async (question: Question, selectedOptionId: number) => {
      if (!userId || isClosed(question.closesAtIst)) return
      if (savingMatchIds.current.has(question.matchId)) return

      savingMatchIds.current.add(question.matchId)
      setSaveErrors((prev) => {
        const next = { ...prev }
        delete next[question.id]
        return next
      })

      const nextSelections = { ...questionSelectionsRef.current, [question.id]: selectedOptionId }
      setQuestionSelections(nextSelections)

      const answers: Answer[] = questionsRef.current
        .filter((q) => nextSelections[q.id] !== undefined)
        .map((q) => ({ questionId: q.id, selectedOption: nextSelections[q.id] }))

      const existingId = userAnswerIdsRef.current[question.matchId]
      try {
        const saved = await repository.saveUserAnswer(question.matchId, userId, answers, existingId)
        if (!existingId) {
          setUserAnswerIds((prev) => ({ ...prev, [question.matchId]: saved.id }))
        }
      } catch (e) {
        const raw = e instanceof Error ? e.message : 'Failed to save pick'
        const m = raw.match(/^\[\d+\] (.+)$/)
        let msg = m ? m[1] : raw
        try {
          msg = (JSON.parse(msg) as { message?: string }).message ?? msg
        } catch {
          /* not JSON */
        }
        setSaveErrors((prev) => ({ ...prev, [question.id]: msg }))
        setQuestionSelections((prev) => {
          const next = { ...prev }
          delete next[question.id]
          return next
        })
      } finally {
        savingMatchIds.current.delete(question.matchId)
      }
    },
    [userId],
  )

  return { questions, questionSelections, saveErrors, saveSelection }
}
