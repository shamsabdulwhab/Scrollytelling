import { createContext, useContext } from 'react'
import type { FormEvent } from 'react'
import type { FormState, ResultData } from '../types'

export type AppFlowContextValue = {
  introSlide: number
  setIntroSlide: React.Dispatch<React.SetStateAction<number>>
  form: FormState
  result: ResultData | null
  hasGenderError: boolean
  hasFieldOfStudyError: boolean
  computedResult: ResultData | null
  handleInputChange: (field: keyof FormState, value: string) => void
  handlePhotoChange: (photoUrl: string | null) => void
  handleApplyCameraSave: (payload: {
    ethnicity: string
    ageRange: string
    confidence: number
    modelGenderLabel?: string
    suggestedGender?: 'woman' | 'man'
  }) => void
  handleClearCameraSaved: () => void
  handleSubmit: (event: FormEvent) => void
  handleBackToIntro: () => void
  handleBackToForm: () => void
  handleRestart: () => void
  handleStart: () => void
  mountFormScene: boolean
}

export const AppFlowContext = createContext<AppFlowContextValue | null>(null)

export function useAppFlow() {
  const ctx = useContext(AppFlowContext)
  if (!ctx) {
    throw new Error('useAppFlow must be used within AppFlowProvider')
  }
  return ctx
}
