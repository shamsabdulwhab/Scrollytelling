import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import './App.css'

type GenderOption = 'woman' | 'man' | 'non-binary' | ''

type FormState = {
  name: string
  gender: GenderOption
  expectedSalary: string
  fieldOfStudy: string
  photoUrl: string | null
}

type ResultData = {
  normalizedExpected: number
  adjustedSalary: number
  gapAmount: number
  gapPercent: number
  currentLevel: number
  expectedLevel: number
}

type Stage = 'intro' | 'form' | 'result'

const DEFAULT_SALARY = 3200
const MAX_SALARY = 8000
const MIN_SALARY = 1200

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function computeGap(gender: GenderOption, rawSalary: number): number {
  if (!rawSalary || Number.isNaN(rawSalary)) return DEFAULT_SALARY
  const clamped = clamp(rawSalary, MIN_SALARY, MAX_SALARY)

  // Very simple conceptual model – replaceable with real data later
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

function mapSalaryToLevel(salary: number): number {
  const ratio =
    (clamp(salary || DEFAULT_SALARY, MIN_SALARY, MAX_SALARY) - MIN_SALARY) /
    (MAX_SALARY - MIN_SALARY)
  // 0 = base of pyramid, 4 = top
  return Math.round(ratio * 4)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

const genderLabels: Record<Exclude<GenderOption, ''>, string> = {
  woman: 'Woman',
  man: 'Man',
  'non-binary': 'Non-binary / Other',
}

function App() {
  const [stage, setStage] = useState<Stage>('intro')
  const [form, setForm] = useState<FormState>({
    name: '',
    gender: '',
    expectedSalary: '',
    fieldOfStudy: '',
    photoUrl: null,
  })
  const [result, setResult] = useState<ResultData | null>(null)

  const hasGenderError = stage === 'form' && form.gender === ''

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

  const handleStart = () => {
    setStage('form')
  }

  const handleInputChange = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.gender) {
      return
    }
    if (computedResult) {
      setResult(computedResult)
    }
    setStage('result')
  }

  const handleRestart = () => {
    setStage('intro')
    setForm({
      name: '',
      gender: '',
      expectedSalary: '',
      fieldOfStudy: '',
      photoUrl: null,
    })
    setResult(null)
  }

  return (
    <div className="app-shell">
      <div className={`scene scene-intro ${stage === 'intro' ? 'is-active' : 'is-hidden'}`}>
        <IntroScene onStart={handleStart} />
      </div>

      <div className={`scene scene-form ${stage === 'form' ? 'is-active' : 'is-hidden'}`}>
        <FormScene
          form={form}
          hasGenderError={hasGenderError}
          parsedExpectedSalary={parsedExpectedSalary}
          onChange={handleInputChange}
          onSubmit={handleSubmit}
        />
      </div>

      <div className={`scene scene-result ${stage === 'result' ? 'is-active' : 'is-hidden'}`}>
        {result && (
          <ResultScene
            form={form}
            result={result}
            onRestart={handleRestart}
          />
        )}
      </div>
    </div>
  )
}

type IntroSceneProps = {
  onStart: () => void
}

function IntroScene({ onStart }: IntroSceneProps) {
  return (
    <section
      className="intro"
      onClick={onStart}
      aria-label="Spin the Pay Gap intro"
    >
      <div className="intro-content">
        <h1 className="intro-title">Spin the Pay Gap</h1>
        <button
          className="primary-button"
          onClick={(event) => {
            event.stopPropagation()
            onStart()
          }}
        >
          Start the experience
        </button>
      </div>
    </section>
  )
}

type FormSceneProps = {
  form: FormState
  hasGenderError: boolean
  parsedExpectedSalary: number
  onChange: (field: keyof FormState, value: string) => void
  onSubmit: (event: FormEvent) => void
}

function FormScene({
  form,
  hasGenderError,
  parsedExpectedSalary,
  onChange,
  onSubmit,
}: FormSceneProps) {
  const topBubbles = useMemo(() => {
    const bubbles: { label: string; tone: 'id' | 'field' | 'salary' }[] = []
    if (form.gender) {
      bubbles.push({
        label: genderLabels[form.gender as Exclude<GenderOption, ''>],
        tone: 'id',
      })
    }
    if (form.fieldOfStudy.trim()) {
      bubbles.push({
        label: form.fieldOfStudy.trim(),
        tone: 'field',
      })
    }
    if (form.expectedSalary.trim()) {
      bubbles.push({
        label: formatCurrency(parsedExpectedSalary),
        tone: 'salary',
      })
    }
    if (form.name.trim()) {
      bubbles.push({
        label: form.name.trim(),
        tone: 'id',
      })
    }
    return bubbles
  }, [form.gender, form.fieldOfStudy, form.expectedSalary, form.name, parsedExpectedSalary])

  return (
    <section className="panel panel-form">
      <header className="panel-header">
        <p className="panel-kicker">Stage 2 · Participation</p>
        <h2>Tell us who you are and what you expect.</h2>
        <p className="panel-body">Only gender is required. Everything else is optional.</p>
      </header>

      <div className="panel-layout">
        <form className="gap-form" onSubmit={onSubmit} noValidate>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="name">Name (optional)</label>
              <input
                id="name"
                type="text"
                placeholder="Type your name"
                value={form.name}
                onChange={(e) => onChange('name', e.target.value)}
              />
            </div>

            <div className={`form-field ${hasGenderError ? 'form-field--error' : ''}`}>
              <div className="label-row">
                <label htmlFor="gender">Gender (required)</label>
                {hasGenderError && <span className="error-text">Please choose a gender to continue.</span>}
              </div>
              <div className="pill-group" id="gender">
                <button
                  type="button"
                  className={`pill ${form.gender === 'woman' ? 'pill--active' : ''}`}
                  onClick={() => onChange('gender', 'woman')}
                >
                  Woman
                </button>
                <button
                  type="button"
                  className={`pill ${form.gender === 'man' ? 'pill--active' : ''}`}
                  onClick={() => onChange('gender', 'man')}
                >
                  Man
                </button>
                <button
                  type="button"
                  className={`pill ${form.gender === 'non-binary' ? 'pill--active' : ''}`}
                  onClick={() => onChange('gender', 'non-binary')}
                >
                  Non-binary / Other
                </button>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="salary">
                Expected monthly salary (optional)
              </label>
              <input
                id="salary"
                type="text"
                inputMode="decimal"
                placeholder="€3,200"
                value={form.expectedSalary}
                onChange={(e) => onChange('expectedSalary', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="field">Field of study (optional)</label>
              <input
                id="field"
                type="text"
                placeholder="Type your field or leave empty"
                value={form.fieldOfStudy}
                onChange={(e) => onChange('fieldOfStudy', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="photo">Your photo (optional)</label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) {
                    onChange('photoUrl', '')
                    return
                  }
                  const url = URL.createObjectURL(file)
                  onChange('photoUrl', url)
                }}
              />
            </div>
          </div>

          <div className="form-footer">
            <button type="submit" className="primary-button primary-button--wide">
              Spin your future
            </button>
            <p className="form-disclaimer">
              This is a conceptual, educational tool. Real-world gaps depend on country, sector, and
              policy.
            </p>
          </div>
        </form>

        <div className="bubble-cloud">
          {topBubbles.length === 0 ? (
            <p className="bubble-cloud-placeholder">
              As you fill in the form, your identity will bloom here.
            </p>
          ) : (
            <div className="bubble-cloud-inner">
              {topBubbles.map((bubble, index) => (
                <span
                  key={`${bubble.label}-${index}`}
                  className={`bubble-chip bubble-chip--${bubble.tone}`}
                  style={{ '--index': index } as React.CSSProperties}
                >
                  {bubble.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

type ResultSceneProps = {
  form: FormState
  result: ResultData
  onRestart: () => void
}

function ResultScene({ form, result, onRestart }: ResultSceneProps) {
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 12, y: -18 })

  const handlePyramidMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width
    const y = (event.clientY - rect.top) / rect.height
    const rotateY = (x - 0.5) * 26 // left / right
    const rotateX = (0.5 - y) * 18 // up / down
    setTilt({ x: rotateX, y: rotateY })
  }

  const handlePyramidMouseLeave = () => {
    setTilt({ x: 12, y: -18 })
  }
  const name = form.name.trim()
  const gender = form.gender

  const headline = name ? `${name}, here is your position.` : 'Here is your position.'

  const ambitionLine = form.expectedSalary.trim()
    ? 'You voiced a clear salary ambition.'
    : 'Even without a number, your ambitions still meet a biased structure.'

  const genderLine =
    gender === 'woman'
      ? 'Because you selected woman, the system quietly nudges your likely outcome down.'
      : gender === 'man'
        ? 'Because you selected man, the system subtly tilts the ladder in your favour.'
        : gender === 'non-binary'
          ? 'Because you selected a non-binary identity, the system often struggles to see you at all.'
          : 'Gender information changes how similar ambitions are rewarded.'

  const gapDescription =
    result.gapAmount > 0
      ? `The distance between what you expect and what the system often delivers is ${formatCurrency(
          result.gapAmount,
        )} each month — around ${result.gapPercent.toFixed(1)}%.`
      : 'In this simplified model your adjusted outcome matches or exceeds your expectation, but the structure is still uneven for others.'

  const suggestions = buildSuggestions(gender, form.fieldOfStudy)

  const levelCount = 5
  const maxIndex = levelCount - 1
  const currentRatio = result.currentLevel / maxIndex
  const expectedRatio = result.expectedLevel / maxIndex
  const currentPercent = 8 + currentRatio * 80
  const expectedPercent = 8 + expectedRatio * 80

  return (
    <section className="panel panel-result">
      <header className="panel-header">
        <p className="panel-kicker">Stage 4–6 · Realisation and action</p>
        <h2>{headline}</h2>
        <p className="panel-body">
          {ambitionLine} {genderLine}
        </p>
      </header>

      <div className="panel-layout panel-layout--result">
        <div className="pyramid-wrapper">
          <h3 className="pyramid-title">Your place on the pyramid</h3>
          <p className="panel-body">
            The pyramid represents economic power and opportunity. Each step up means more income,
            influence, and security.
          </p>

          <div
            className="pyramid"
            onMouseMove={handlePyramidMouseMove}
            onMouseLeave={handlePyramidMouseLeave}
            style={
              {
                '--current-pos': `${currentPercent}%`,
                '--expected-pos': `${expectedPercent}%`,
                '--tilt-x': `${tilt.x}deg`,
                '--tilt-y': `${tilt.y}deg`,
              } as React.CSSProperties
            }
          >
            <div className="pyramid-stage">
              <div className="pyramid-shape">
                <div className="pyramid-human pyramid-human--current">
                  {form.photoUrl && (
                    <div className="pyramid-avatar">
                      <img src={form.photoUrl} alt="Your current position" />
                    </div>
                  )}
                </div>
                <div className="pyramid-human pyramid-human--expected">
                  {form.photoUrl && (
                    <div className="pyramid-avatar pyramid-avatar--ghost">
                      <img src={form.photoUrl} alt="Your expected position" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pyramid-steps">
              <span>Base</span>
              <span>Entry</span>
              <span>Mid</span>
              <span>Senior</span>
              <span>Top</span>
            </div>
          </div>

          <div className="pyramid-legend">
            <span className="legend-dot legend-dot--current" />
            <span>Your current likely position</span>
            <span className="legend-dot legend-dot--expected" />
            <span>Where your ambition points</span>
          </div>
        </div>

        <div className="gap-wrapper">
          <h3 className="gap-title">How the gap adds up</h3>
          <p className="panel-body">{gapDescription}</p>

          <div className="gap-cards">
            <div className="gap-card">
              <h4>Expected income</h4>
              <p className="gap-value">{formatCurrency(result.normalizedExpected)}</p>
              <p className="gap-caption">Where you imagine yourself landing.</p>
            </div>
            <div className="gap-card gap-card--dimmed">
              <h4>System-adjusted outcome</h4>
              <p className="gap-value">{formatCurrency(result.adjustedSalary)}</p>
              <p className="gap-caption">
                Where biased structures often place someone with your gender.
              </p>
            </div>
            <div className="gap-card gap-card--accent">
              <h4>Monthly gap</h4>
              <p className="gap-value">
                {result.gapAmount > 0 ? formatCurrency(result.gapAmount) : '—'}
              </p>
              <p className="gap-caption">
                {result.gapAmount > 0
                  ? `That&apos;s about ${result.gapPercent.toFixed(1)}% of your expected pay.`
                  : 'Here the model shows no loss, but many others still face one.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="suggestions suggestions--separate">
        <div className="suggestions-header">
          <p className="panel-kicker">AI-style suggestions</p>
          <h3>Ways to challenge the gap</h3>
        </div>
        <div className="suggestion-grid">
          {suggestions.map((item) => (
            <article key={item.title} className="suggestion-card">
              <div className="suggestion-icon" aria-hidden="true">
                {item.icon}
              </div>
              <h4>{item.title}</h4>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <button className="secondary-button" onClick={onRestart}>
          Spin again with a different profile
        </button>
      </div>
    </section>
  )
}

type Suggestion = {
  title: string
  body: string
  icon: string
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

export default App
