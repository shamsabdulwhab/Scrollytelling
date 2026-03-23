import type { FormEvent } from 'react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SALARY, MAX_SALARY, MIN_SALARY, PYRAMID_LEVEL_COUNT } from './constants'
import { IntroScene } from './pages/IntroScene'
import type { FormState, GenderOption, ResultData, Stage } from './types'
import './App.css'

const FormScene = lazy(async () => {
  const m = await import('./pages/FormScene')
  return { default: m.FormScene }
})

const ResultScene = lazy(async () => {
  const m = await import('./pages/ResultScene')
  return { default: m.ResultScene }
})

/** Keep a number between min and max (used for salary math) */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Rough “adjusted” salary used in the demo (depends on gender) */
function computeGap(gender: GenderOption, rawSalary: number): number {
  if (!rawSalary || Number.isNaN(rawSalary)) return DEFAULT_SALARY
  const clamped = clamp(rawSalary, MIN_SALARY, MAX_SALARY)

  switch (gender) {
    case 'woman':
      return clamped * 0.84
    case 'non-binary':
      return clamped * 0.88
    case 'man':
      return clamped * 1.02
    default:
      return clamped * 0.95
  }
}

/** Map salary to a pyramid step 0 .. PYRAMID_LEVEL_COUNT - 1 */
function mapSalaryToLevel(salary: number): number {
  const ratio =
    (clamp(salary || DEFAULT_SALARY, MIN_SALARY, MAX_SALARY) - MIN_SALARY) /
    (MAX_SALARY - MIN_SALARY)
  return Math.round(ratio * (PYRAMID_LEVEL_COUNT - 1))
}

function App() {
  /**
   * stage = which screen of the app is visible:
   *   'intro' | 'form' | 'result'
   */
  const [stage, setStage] = useState<Stage>('intro')

  /**
   * introSlide = which intro slide (only matters when stage is 'intro')
   *   0 = title + coins
   *   1 = stats (black screen)
   * Stored here so we can reset it when you leave intro or restart.
   */
  const [introSlide, setIntroSlide] = useState(0)

  const [form, setForm] = useState<FormState>({
    displayName: '',
    gender: '',
    expectedSalary: '',
    fieldOfStudy: '',
    photoUrl: null,
    cameraSavedEthnicity: undefined,
    cameraSavedAgeRange: undefined,
    cameraSavedConfidence: undefined,
  })

  const [result, setResult] = useState<ResultData | null>(null)

  /**
   * Keep FormScene mounted when returning to intro so `.scene` opacity/transform transitions
   * still run (TensorFlow only loads after first visit to form or result).
   */
  const formSceneEverMountedRef = useRef(false)

  useEffect(() => {
    if (stage === 'form' || stage === 'result') {
      formSceneEverMountedRef.current = true
    }
  }, [stage])

  const hasGenderError = stage === 'form' && form.gender === ''

  const parsedExpectedSalary = useMemo(() => {
    const val = Number(form.expectedSalary.replace(/[^\d.]/g, ''))
    if (!val || Number.isNaN(val)) return DEFAULT_SALARY
    return val
  }, [form.expectedSalary])

  useEffect(() => {
    if (stage !== 'intro') {
      return
    }
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
    }
  }, [stage])

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

  /** User finished intro (stats slide) — open form and reset intro slide for next time */
  function handleStart() {
    setIntroSlide(0)
    setStage('form')
  }

  function handleInputChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePhotoChange(photoUrl: string | null) {
    setForm((prev) => ({
      ...prev,
      photoUrl,
      ...(photoUrl === null
        ? {
            cameraSavedEthnicity: undefined,
            cameraSavedAgeRange: undefined,
            cameraSavedConfidence: undefined,
          }
        : {}),
    }))
  }

  function handleClearCameraSaved() {
    setForm((prev) => ({
      ...prev,
      cameraSavedEthnicity: undefined,
      cameraSavedAgeRange: undefined,
      cameraSavedConfidence: undefined,
    }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!form.gender) {
      return
    }
    if (computedResult) {
      setResult(computedResult)
    }
    setStage('result')
  }

  const handleBackToIntro = () => {
    setIntroSlide(0)
    setStage('intro')
  }

  const handleBackToForm = () => {
    setStage('form')
  }

  const handleRestart = () => {
    formSceneEverMountedRef.current = false
    setIntroSlide(0)
    setStage('intro')
    setForm({
      displayName: '',
      gender: '',
      expectedSalary: '',
      fieldOfStudy: '',
      photoUrl: null,
      cameraSavedEthnicity: undefined,
      cameraSavedAgeRange: undefined,
      cameraSavedConfidence: undefined,
    })
    setResult(null)
  }

  // CSS class for the outer wrapper (white intro vs black stats intro)
  const isIntroStage = stage === 'intro'
  const isStatsIntroSlide = introSlide === 1
  let appShellClass = 'app-shell'
  if (isIntroStage) {
    appShellClass += ' app-shell--intro'
    if (isStatsIntroSlide) {
      appShellClass += ' app-shell--intro-stats'
    }
  } else if (stage === 'form') {
    appShellClass += ' app-shell--form'
  } else if (stage === 'result') {
    appShellClass += ' app-shell--result'
  }

  const sceneFallback = (
    <div className="app-scene-fallback" role="status" aria-live="polite">
      Loading…
    </div>
  )

  const mountFormScene = formSceneEverMountedRef.current || stage !== 'intro'

  return (
    <div className={appShellClass}>
      <div className={`scene scene-intro ${stage === 'intro' ? 'is-active' : 'is-hidden'}`}>
        <IntroScene slide={introSlide} onSlideChange={setIntroSlide} onStart={handleStart} />
      </div>

      <div className={`scene scene-form ${stage === 'form' ? 'is-active' : 'is-hidden'}`}>
        {mountFormScene && (
          <Suspense fallback={sceneFallback}>
            <FormScene
              form={form}
              hasGenderError={hasGenderError}
              onChange={handleInputChange}
              onPhotoChange={handlePhotoChange}
              onApplyCameraSave={(payload) =>
                setForm((prev) => ({
                  ...prev,
                  gender: payload.gender,
                  cameraSavedEthnicity: payload.ethnicity,
                  cameraSavedAgeRange: payload.ageRange,
                  cameraSavedConfidence: payload.confidence,
                }))
              }
              onClearCameraSaved={handleClearCameraSaved}
              onSubmit={handleSubmit}
              onBack={handleBackToIntro}
            />
          </Suspense>
        )}
      </div>

      <div className={`scene scene-result ${stage === 'result' ? 'is-active' : 'is-hidden'}`}>
        {result && (
          <Suspense fallback={sceneFallback}>
            <ResultScene
              form={form}
              result={result}
              onBack={handleBackToForm}
              onRestart={handleRestart}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

export default App
