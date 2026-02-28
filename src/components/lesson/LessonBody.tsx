'use client'

import React from 'react'
import { DeepDiveProvider } from './DeepDive'
import { DefinitionProvider } from './Definition'
import { QuizProvider } from './QuizProvider'
import type { ActiveQuizQuestion } from '@/types/database.types'

interface LessonBodyProps {
  children: React.ReactNode
  quizQuestions?: ActiveQuizQuestion[]
}

export function LessonBody({ children, quizQuestions = [] }: LessonBodyProps) {
  return (
    <DeepDiveProvider>
      <DefinitionProvider>
        <QuizProvider questions={quizQuestions}>
          {children}
        </QuizProvider>
      </DefinitionProvider>
    </DeepDiveProvider>
  )
}
