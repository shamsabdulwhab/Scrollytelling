import type { CSSProperties, MouseEvent } from 'react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { BackArrowButton } from '../components/BackArrowButton'
import { PYRAMID_LEVEL_COUNT, PYRAMID_VISUAL_STAIRS } from '../constants'
import type { FormState, GenderOption, ResultData } from '../types'

export type ResultSceneProps = {
  form: FormState
  result: ResultData
  onBack: () => void
  onRestart: () => void
}

type Suggestion = {
  title: string
  body: string
  icon: string
}

function StoryCard({ item }: { item: Suggestion }) {
  return (
    <div className="story-cardPinned active">
      <div className="story-card-inner">
        <div className="suggestion-icon" aria-hidden="true">
          {item.icon}
        </div>
        <div>
          <h4 className="story-card-title">{item.title}</h4>
          <p className="story-card-body">{item.body}</p>
        </div>
      </div>
    </div>
  )
}

function buildSuggestions(gender: GenderOption, rawField: string): Suggestion[] {
  const field = rawField.trim().toLowerCase()
  const inTechLike =
    field.includes('front') ||
    field.includes('developer') ||
    field.includes('engineer') ||
    field.includes('tech')

  const core: Suggestion[] = [
    {
      title: 'Ask for salary transparency',
      body: 'Push for clear salary bands and open pay ranges so gaps cannot hide in silence.',
      icon: '◎',
    },
    {
      title: 'Prepare for negotiation, not gratitude',
      body: 'Enter job talks with data, benchmarks, and a number in mind — not just “thank you for the offer.”',
      icon: '⇧',
    },
    {
      title: 'Track and show your impact',
      body: 'Keep a living record of projects, results, and compliments so your value is visible during reviews.',
      icon: '◆',
    },
  ]

  const genderSpecific: Suggestion[] =
    gender === 'woman'
      ? [
          {
            title: 'Turn “nice to have” into “hard to replace”',
            body: 'Women are often over-credited for soft skills and underpaid for impact. Document the measurable results your work creates.',
            icon: '♀',
          },
          {
            title: 'Build an ally circle',
            body: 'Ask peers of all genders to echo your ideas in meetings and credit you by name to reduce idea-stealing.',
            icon: '∞',
          },
        ]
      : gender === 'man'
        ? [
            {
              title: 'Use advantage as leverage for others',
              body: 'If your offers come in higher, normalise questioning why and advocate for colleagues at the same level.',
              icon: '♂',
            },
            {
              title: 'Decline biased panels and teams',
              body: 'When invited into all-male panels or leadership groups, ask who is missing and suggest names.',
              icon: '⚖',
            },
          ]
        : gender === 'non-binary'
          ? [
              {
                title: 'Make your boundaries part of the brief',
                body: 'Be explicit about your name, pronouns, and visibility needs when you can; structure can adapt if it is forced to notice.',
                icon: '⚧',
              },
              {
                title: 'Seek queer-aware mentors',
                body: 'Find people who understand how identity, safety, and pay intersect, not just “career advice for everyone.”',
                icon: '✶',
              },
            ]
          : [
              {
                title: 'Learn the numbers in your country',
                body: 'Look up current pay gap statistics in your field and region so you can read offers with a sharper eye.',
                icon: '%',
              },
            ]

  const fieldSpecific: Suggestion[] = inTechLike
    ? [
        {
          title: 'Audit who ships and who presents',
          body: 'In tech teams, check who writes the code and who gets the spotlight. Advocate for visibility to follow contribution.',
          icon: '</>',
        },
      ]
    : []

  return [...core, ...genderSpecific, ...fieldSpecific]
}

const WHEEL_COOLDOWN_MS = 1250

export function ResultScene({ form, result, onBack, onRestart }: ResultSceneProps) {
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 12, y: -18 })
  const [activeStoryStep, setActiveStoryStep] = useState(0)

  const cardsViewportRef = useRef<HTMLDivElement>(null)
  const [slidePx, setSlidePx] = useState(0)
  const wheelCooldownRef = useRef(false)
  const lastStoryIndexRef = useRef(0)
  const touchStartY = useRef(0)

  const handlePyramidMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 26
    const rotateX = (0.5 - y) * 18
    setTilt({ x: rotateX, y: rotateY })
  }

  const handlePyramidMouseLeave = () => {
    setTilt({ x: 12, y: -18 })
  }
  const gender = form.gender

  const headline = 'Here is your position.'

  const suggestions = buildSuggestions(gender, form.fieldOfStudy)
  const lastStoryIndex = Math.max(0, suggestions.length - 1)

  useEffect(() => {
    setActiveStoryStep((s) => Math.min(Math.max(0, s), lastStoryIndex))
  }, [lastStoryIndex, suggestions.length])

  useLayoutEffect(() => {
    const el = cardsViewportRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setSlidePx(el.clientHeight)
    })
    ro.observe(el)
    setSlidePx(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  lastStoryIndexRef.current = lastStoryIndex

  useEffect(() => {
    const el = cardsViewportRef.current
    if (!el || suggestions.length <= 1) return

    const onWheel = (e: WheelEvent) => {
      if (wheelCooldownRef.current) {
        e.preventDefault()
        return
      }
      const down = e.deltaY > 10
      const up = e.deltaY < -10
      if (!down && !up) return

      e.preventDefault()

      setActiveStoryStep((s) => {
        const max = lastStoryIndexRef.current
        let next = s
        if (down) next = Math.min(max, s + 1)
        else if (up) next = Math.max(0, s - 1)
        if (next !== s) {
          wheelCooldownRef.current = true
          window.setTimeout(() => {
            wheelCooldownRef.current = false
          }, WHEEL_COOLDOWN_MS)
        }
        return next
      })
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [suggestions.length])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (wheelCooldownRef.current || suggestions.length <= 1) return
      const dy = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(dy) < 56) return

      wheelCooldownRef.current = true
      window.setTimeout(() => {
        wheelCooldownRef.current = false
      }, WHEEL_COOLDOWN_MS)

      if (dy > 0) {
        setActiveStoryStep((s) => Math.min(lastStoryIndexRef.current, s + 1))
      } else {
        setActiveStoryStep((s) => Math.max(0, s - 1))
      }
    },
    [suggestions.length],
  )

  const levelCount = PYRAMID_LEVEL_COUNT
  const maxIndex = levelCount - 1
  const currentRatio = result.currentLevel / maxIndex
  const expectedRatio = result.expectedLevel / maxIndex
  const currentPercent = 8 + currentRatio * 80
  const expectedPercent = 8 + expectedRatio * 80

  const storyStepPercent = useMemo(() => {
    const maxIdx = Math.max(1, suggestions.length - 1)
    const clamped = Math.max(0, Math.min(maxIdx, activeStoryStep))
    return 8 + (clamped / maxIdx) * 72
  }, [activeStoryStep, suggestions.length])

  const trackOffset = slidePx > 0 ? activeStoryStep * slidePx : 0

  return (
    <section className="form-page result-page">
      <div className="form-page__accent form-page__accent--gold" aria-hidden="true" />
      <div className="form-page__accent form-page__accent--pink form-page__accent--pink-a" aria-hidden="true" />
      <div className="form-page__accent form-page__accent--pink form-page__accent--pink-b" aria-hidden="true" />

      <div className="form-page__back">
        <BackArrowButton onClick={onBack} label="Back to form" />
      </div>

      <h1 className="form-page__headline">{headline}</h1>

      <div className="story-layout result-page__layout">
        <div className="story-left result-page__pyramid-col">
          <div className="pyramid-wrapper pyramid-wrapper--sticky">
            <h2 className="pyramid-title">Your place on the pyramid</h2>
            <div
              className="pyramid pyramid--result-wide"
              onMouseMove={handlePyramidMouseMove}
              onMouseLeave={handlePyramidMouseLeave}
              style={
                {
                  '--current-pos': `${currentPercent}%`,
                  '--expected-pos': `${expectedPercent}%`,
                  '--story-pos': `${storyStepPercent}%`,
                  '--tilt-x': `${tilt.x}deg`,
                  '--tilt-y': `${tilt.y}deg`,
                  '--pyramid-stair-lines': PYRAMID_VISUAL_STAIRS,
                } as CSSProperties
              }
            >
              <div className="pyramid-stage">
                <div className="pyramid-shape">
                  <div className="pyramid-human pyramid-human--current">
                    {form.photoUrl && (
                      <div className="pyramid-avatar pyramid-avatar--now">
                        <span className="sr-only">Your current likely position on the pyramid</span>
                        <div className="pyramid-avatar__ring">
                          <img src={form.photoUrl} alt="" />
                          <span className="pyramid-avatar__badge pyramid-avatar__badge--now" aria-hidden="true">
                            Now
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="pyramid-human pyramid-human--expected">
                    {form.photoUrl && (
                      <div className="pyramid-avatar pyramid-avatar--goal">
                        <span className="sr-only">Where your ambition points on the pyramid</span>
                        <div className="pyramid-avatar__ring pyramid-avatar__ring--goal">
                          <img
                            src={form.photoUrl}
                            alt=""
                            className="pyramid-avatar__img--goal"
                          />
                          <span className="pyramid-avatar__badge pyramid-avatar__badge--goal" aria-hidden="true">
                            Goal
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {form.photoUrl && (
                    <div className="pyramid-human pyramid-human--story">
                      <div className="pyramid-avatar pyramid-avatar--story">
                        <span className="sr-only">Tip card position</span>
                        <div className="pyramid-avatar__ring pyramid-avatar__ring--story">
                          <img src={form.photoUrl} alt="" className="pyramid-avatar__img--story" />
                          <span className="pyramid-avatar__badge pyramid-avatar__badge--story" aria-hidden="true">
                            Tip
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pyramid-legend">
              <span className="legend-dot legend-dot--current" />
              <span>Your current likely position</span>
              <span className="legend-dot legend-dot--expected" />
              <span>Where your ambition points</span>
            </div>
          </div>
        </div>

        <div className="story-right result-page__cards-col">
          <div className="story-scroll story-scroll--fit">
            <div className="story-pinned story-pinned--fit">
              <div
                ref={cardsViewportRef}
                className="result-page__cards-viewport"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                <div
                  className="result-page__cards-track"
                  style={{
                    transform: `translateY(-${trackOffset}px)`,
                    height: slidePx > 0 ? slidePx * suggestions.length : undefined,
                  }}
                >
                  {suggestions.map((s, i) => (
                    <div
                      key={`${s.title}-${i}`}
                      className="result-page__cards-slide"
                      style={{
                        minHeight: slidePx > 0 ? slidePx : undefined,
                        height: slidePx > 0 ? slidePx : undefined,
                      }}
                    >
                      <StoryCard item={s} />
                    </div>
                  ))}
                </div>
              </div>

              <p className="result-page__scroll-hint" aria-hidden="true">
                Scroll or swipe — next tip rises from below
              </p>

              <div className="result-page__dots" role="tablist" aria-label="Tips">
                {suggestions.map((_, idx) => (
                  <span
                    key={idx}
                    role="presentation"
                    className={`result-page__dot ${idx === activeStoryStep ? 'is-active' : ''}`}
                  />
                ))}
              </div>

              <div className="story-footer">
                <button type="button" className="result-page__restart" onClick={onRestart}>
                  Spin again with a different profile
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
