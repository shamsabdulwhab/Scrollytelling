import { lazy, Suspense, useEffect, useMemo } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppFlow } from '../app/appFlowContext'
import { IntroScene } from '../pages/IntroScene'
import { appPathnameFromLocation } from '../utils/appPathname'

const FormScene = lazy(async () => {
  const m = await import('../pages/FormScene')
  return { default: m.FormScene }
})

const ResultScene = lazy(async () => {
  const m = await import('../pages/ResultScene')
  return { default: m.ResultScene }
})

export function AppShellLayout() {
  const location = useLocation()
  const pathname = appPathnameFromLocation(location.pathname)

  const {
    introSlide,
    setIntroSlide,
    form,
    result,
    computedResult,
    hasGenderError,
    hasFieldOfStudyError,
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
  } = useAppFlow()

  const isKnownRoute =
    pathname === '/' || pathname === '/form' || pathname === '/result'

  const stage = useMemo(() => {
    if (!isKnownRoute) return 'intro' as const
    if (pathname === '/form') return 'form' as const
    if (pathname === '/result') return 'result' as const
    return 'intro' as const
  }, [isKnownRoute, pathname])

  const shouldLockIntroScroll = isKnownRoute && stage === 'intro'

  useEffect(() => {
    if (!shouldLockIntroScroll) {
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
  }, [shouldLockIntroScroll])

  if (!isKnownRoute) {
    return <Navigate to="/" replace />
  }

  const resultForScene = result ?? computedResult

  if (pathname === '/result' && !computedResult) {
    return <Navigate to="/form" replace />
  }

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
              hasFieldOfStudyError={hasFieldOfStudyError}
              onChange={handleInputChange}
              onPhotoChange={handlePhotoChange}
              onApplyCameraSave={handleApplyCameraSave}
              onClearCameraSaved={handleClearCameraSaved}
              onSubmit={handleSubmit}
              onBack={handleBackToIntro}
            />
          </Suspense>
        )}
      </div>

      <div className={`scene scene-result ${stage === 'result' ? 'is-active' : 'is-hidden'}`}>
        {resultForScene && (
          <Suspense fallback={sceneFallback}>
            <ResultScene
              form={form}
              result={resultForScene}
              onBack={handleBackToForm}
              onRestart={handleRestart}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}
