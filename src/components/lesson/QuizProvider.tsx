'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'
import type { ActiveQuizQuestion } from '@/types/database.types'

// ============================================================
// Types
// ============================================================

export interface QuizAnswerState {
  selectedAnswer: string
  submitted: boolean
  isCorrect: boolean
}

interface QuizContextValue {
  questions: Record<string, ActiveQuizQuestion>
  answers: Record<string, QuizAnswerState>
  submitAnswer: (questionId: string, selectedAnswer: string, isCorrect: boolean) => void
}

// ============================================================
// Context
// ============================================================

const QuizContext = createContext<QuizContextValue | null>(null)

export function useQuizContext(): QuizContextValue {
  const ctx = useContext(QuizContext)
  if (!ctx) {
    throw new Error('useQuizContext must be used within a QuizProvider')
  }
  return ctx
}

// ============================================================
// Provider
// ============================================================

interface QuizProviderProps {
  questions: ActiveQuizQuestion[]
  children: React.ReactNode
}

export function QuizProvider({ questions, children }: QuizProviderProps) {
  const questionMap = useMemo<Record<string, ActiveQuizQuestion>>(
    () => Object.fromEntries(questions.map((q) => [q.id, q])),
    [questions]
  )

  const [answers, setAnswers] = useState<Record<string, QuizAnswerState>>({})

  function submitAnswer(questionId: string, selectedAnswer: string, isCorrect: boolean) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { selectedAnswer, submitted: true, isCorrect },
    }))
  }

  return (
    <QuizContext.Provider value={{ questions: questionMap, answers, submitAnswer }}>
      {children}
    </QuizContext.Provider>
  )
}
