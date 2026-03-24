import type { FormEvent, ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { DEFAULT_SALARY, MAX_SALARY, MIN_SALARY } from '../constants'
import type { FormState, ResultData } from '../types'
import { appPathnameFromLocation } from '../utils/appPathname'
import { clamp, computeGap, mapSalaryToLevel } from '../utils/salaryResult'
import { AppFlowContext, type AppFlowContextValue } from './appFlowContext'

const initialForm: FormState = {
  companyName: '',
  gender: '',
  expectedSalary: '',
  fieldOfStudy: '',
  photoUrl: null,
  cameraSavedEthnicity: undefined,
  cameraSavedAgeRange: undefined,
  cameraSavedConfidence: undefined,
  cameraSavedModelGender: undefined,
  cameraSavedSuggestedGender: undefined,
}

type AppFlowProviderProps = { children: ReactNode }

export function AppFlowProvider({ children }: AppFlowProviderProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const pathname = appPathnameFromLocation(location.pathname)

  const [introSlide, setIntroSlide] = useState(0)
  const [form, setForm] = useState<FormState>(initialForm)
  const [result, setResult] = useState<ResultData | null>(null)
  const [formSceneVisited, setFormSceneVisited] = useState(
    () => pathname === '/form' || pathname === '/result',
  )

  const stage =
    pathname === '/form' ? 'form' : pathname === '/result' ? 'result' : 'intro'

  const hasGenderError = stage === 'form' && form.gender === ''
  const hasFieldOfStudyError = stage === 'form' && form.fieldOfStudy === ''

  const parsedExpectedSalary = useMemo(() => {
    const val = Number(form.expectedSalary.replace(/[^\d.]/g, ''))
    if (!val || Number.isNaN(val)) return DEFAULT_SALARY
    return val
  }, [form.expectedSalary])

  const computedResult: ResultData | null = useMemo(() => {
    if (!form.gender) return null
    const normalizedExpected = clamp(parsedExpectedSalary, MIN_SALARY, MAX_SALARY)
    const adjusted = computeGap(form.gender, normalizedExpected)
    const gapAmount = normalizedExpected - adjusted
    const gapPercent = gapAmount > 0 ? (gapAmount / normalizedExpected) * 100 : 0

    const expectedLevel = mapSalaryToLevel(normalizedExpected)
    const currentLevel = mapSalaryToLevel(adjusted)

    return {
      normalizedExpected,
      adjustedSalary: adjusted,
      gapAmount,
      gapPercent,
      currentLevel,
      expectedLevel,
    }
  }, [form.gender, parsedExpectedSalary])

  const handleStart = useCallback(() => {
    setIntroSlide(0)
    setFormSceneVisited(true)
    navigate('/form')
  }, [navigate])

  const handleInputChange = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handlePhotoChange = useCallback((photoUrl: string | null) => {
    setForm((prev) => ({
      ...prev,
      photoUrl,
      ...(photoUrl === null
        ? {
            cameraSavedEthnicity: undefined,
            cameraSavedAgeRange: undefined,
            cameraSavedConfidence: undefined,
            cameraSavedModelGender: undefined,
            cameraSavedSuggestedGender: undefined,
          }
        : {}),
    }))
  }, [])

  const handleApplyCameraSave = useCallback(
    (payload: {
      ethnicity: string
      ageRange: string
      confidence: number
      modelGenderLabel?: string
      suggestedGender?: 'woman' | 'man'
    }) => {
      setForm((prev) => ({
        ...prev,
        cameraSavedEthnicity: payload.ethnicity,
        cameraSavedAgeRange: payload.ageRange,
        cameraSavedConfidence: payload.confidence,
        cameraSavedModelGender: payload.modelGenderLabel,
        cameraSavedSuggestedGender: payload.suggestedGender,
        ...(payload.suggestedGender != null ? { gender: payload.suggestedGender } : {}),
      }))
    },
    [],
  )

  const handleClearCameraSaved = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      cameraSavedEthnicity: undefined,
      cameraSavedAgeRange: undefined,
      cameraSavedConfidence: undefined,
      cameraSavedModelGender: undefined,
      cameraSavedSuggestedGender: undefined,
    }))
  }, [])

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      if (!form.gender || !form.fieldOfStudy) {
        return
      }
      const normalizedExpected = clamp(parsedExpectedSalary, MIN_SALARY, MAX_SALARY)
      const adjusted = computeGap(form.gender, normalizedExpected)
      const gapAmount = normalizedExpected - adjusted
      const gapPercent = gapAmount > 0 ? (gapAmount / normalizedExpected) * 100 : 0
      const nextResult: ResultData = {
        normalizedExpected,
        adjustedSalary: adjusted,
        gapAmount,
        gapPercent,
        currentLevel: mapSalaryToLevel(adjusted),
        expectedLevel: mapSalaryToLevel(normalizedExpected),
      }
      // Commit result before navigating so /result never renders with result === null (avoids redirect to /form).
      flushSync(() => {
        setResult(nextResult)
        setFormSceneVisited(true)
      })
      navigate('/result')
    },
    [form.gender, form.fieldOfStudy, parsedExpectedSalary, navigate],
  )

  const handleBackToIntro = useCallback(() => {
    setIntroSlide(0)
    navigate('/')
  }, [navigate])

  const handleBackToForm = useCallback(() => {
    navigate('/form')
  }, [navigate])

  const handleRestart = useCallback(() => {
    setFormSceneVisited(false)
    setIntroSlide(0)
    navigate('/')
    setForm(initialForm)
    setResult(null)
  }, [navigate])

  const mountFormScene = formSceneVisited || stage !== 'intro'

  const value = useMemo<AppFlowContextValue>(
    () => ({
      introSlide,
      setIntroSlide,
      form,
      result,
      hasGenderError,
      hasFieldOfStudyError,
      computedResult,
      handleInputChange,
      handlePhotoChange,
      handleApplyCameraSave,
      handleClearCameraSaved,
      handleSubmit,
      handleBackToIntro,
      handleBackToForm,
      handleRestart,
      handleStart,
      mountFormScene,
    }),
    [
      introSlide,
      form,
      result,
      hasGenderError,
      hasFieldOfStudyError,
      computedResult,
      handleInputChange,
      handlePhotoChange,
      handleApplyCameraSave,
      handleClearCameraSaved,
      handleSubmit,
      handleBackToIntro,
      handleBackToForm,
      handleRestart,
      handleStart,
      mountFormScene,
    ],
  )

  return <AppFlowContext.Provider value={value}>{children}</AppFlowContext.Provider>
}
