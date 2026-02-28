'use client'

import React from 'react'
import { DeepDiveProvider } from './DeepDive'
import { DefinitionProvider } from './Definition'

interface LessonBodyProps {
  children: React.ReactNode
}

export function LessonBody({ children }: LessonBodyProps) {
  return (
    <DeepDiveProvider>
      <DefinitionProvider>
        {children}
      </DefinitionProvider>
    </DeepDiveProvider>
  )
}
