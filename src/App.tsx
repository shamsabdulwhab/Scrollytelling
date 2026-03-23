import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as blazeface from '@tensorflow-models/blazeface'
import * as tf from '@tensorflow/tfjs'
import './App.css'

type GenderOption = 'woman' | 'man' | 'non-binary' | ''

type FormState = {
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

/** Experimental API; not in all `lib.dom` versions as `Window` member */
type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean
  maxDetectedFaces?: number
}) => {
  detect(image: ImageBitmapSource): Promise<Array<{ boundingBox?: DOMRectReadOnly }>>
}

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

const genderLabels: Record<Exclude<GenderOption, ''>, string> = {
  woman: 'Woman',
  man: 'Man',
  'non-binary': 'Non-binary / Other',
}

function App() {
  const [stage, setStage] = useState<Stage>('intro')
  const [form, setForm] = useState<FormState>({
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

  const handleStart = () => {
    setStage('form')
  }

  const handleInputChange = (
    field: keyof FormState,
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (photoUrl: string | null) => {
    setForm((prev) => ({ ...prev, photoUrl }))
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
      gender: '',
      expectedSalary: '',
      fieldOfStudy: '',
      photoUrl: null,
    })
    setResult(null)
  }

  return (
    <div className={`app-shell${stage === 'intro' ? ' app-shell--intro' : ''}`}>
      <div className={`scene scene-intro ${stage === 'intro' ? 'is-active' : 'is-hidden'}`}>
        <IntroScene onStart={handleStart} />
      </div>

      <div className={`scene scene-form ${stage === 'form' ? 'is-active' : 'is-hidden'}`}>
        <FormScene
          form={form}
          hasGenderError={hasGenderError}
          onChange={handleInputChange}
          onPhotoChange={handlePhotoChange}
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
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onStart()
    }
  }

  return (
    <section
      className="intro"
      onClick={onStart}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label="The gender wage gap, click or press Enter to continue"
    >
      <div className="intro-line" aria-hidden="true" />
      <div className="intro-coins" aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n} className={`intro-coin intro-coin--${n}`}>
            <img
              className="intro-coin__img"
              src={`${import.meta.env.BASE_URL}Eurosign.png`}
              alt=""
              draggable={false}
            />
          </span>
        ))}
      </div>
      <div className="intro-content">
        <h1 className="intro-title">
          <span className="intro-title__black">THE </span>
          <span className="intro-title__pink">GENDER WAGE </span>
          <span className="intro-title__black">GAP</span>
        </h1>
      </div>
    </section>
  )
}

type FormSceneProps = {
  form: FormState
  hasGenderError: boolean
  onChange: (field: keyof FormState, value: string) => void
  onPhotoChange: (photoUrl: string | null) => void
  onSubmit: (event: FormEvent) => void
}

type PhotoAnalysis = {
  faceCount: number | null
  brightness: number | null // 0..1
  contrast: number | null // 0..1
  highlightClip: number | null // 0..1 fraction near-white
  shadowClip: number | null // 0..1 fraction near-black
  clutter: number | null // 0..1 edge density proxy
  framing: 'close' | 'ok' | 'far' | 'unknown'
  note: string
  canProceed: boolean
}

function FormScene({
  form,
  hasGenderError,
  onChange,
  onPhotoChange,
  onSubmit,
}: FormSceneProps) {
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null)
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null)
  const [faceModelStatus, setFaceModelStatus] = useState<
    'idle' | 'loading' | 'ready' | 'failed'
  >('idle')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (faceModelRef.current) return
      try {
        setFaceModelStatus('loading')
        // Prefer WebGL for speed; fallback to CPU if unavailable.
        try {
          await tf.setBackend('webgl')
          await tf.ready()
        } catch {
          // Ignore backend failures; tfjs will fallback to another backend.
        }
        const model = await blazeface.load()
        if (!cancelled) {
          faceModelRef.current = model
          setFaceModelStatus('ready')
        }
      } catch {
        if (!cancelled) setFaceModelStatus('failed')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!form.photoUrl) {
      setAnalysis(null)
      return
    }

    const photoUrl = form.photoUrl
    let cancelled = false
    const run = async () => {
      try {
        const img = new Image()
        img.src = photoUrl
        await img.decode()

        const w = Math.max(1, img.naturalWidth || img.width || 640)
        const h = Math.max(1, img.naturalHeight || img.height || 480)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('canvas')
        ctx.drawImage(img, 0, 0, w, h)

        // Downsample for fast analysis
        const targetW = Math.min(240, w)
        const targetH = Math.max(1, Math.round((h / w) * targetW))
        const small = document.createElement('canvas')
        small.width = targetW
        small.height = targetH
        const sctx = small.getContext('2d', { willReadFrequently: true })
        if (!sctx) throw new Error('canvas-small')
        sctx.drawImage(canvas, 0, 0, targetW, targetH)

        const imgData = sctx.getImageData(0, 0, targetW, targetH)
        const data = imgData.data

        // Luminance stats
        let sum = 0
        let sumSq = 0
        let highlightClip = 0
        let shadowClip = 0
        const n = targetW * targetH
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const y = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
          sum += y
          sumSq += y * y
          if (y > 0.97) highlightClip += 1
          if (y < 0.03) shadowClip += 1
        }
        const brightness = sum / n
        const variance = Math.max(0, sumSq / n - brightness * brightness)
        const contrast = Math.min(1, Math.sqrt(variance) / 0.5) // normalize rough
        const highlightClipFrac = highlightClip / n
        const shadowClipFrac = shadowClip / n

        // Edge density (Sobel) for clutter proxy
        // Build grayscale buffer
        const gray = new Float32Array(n)
        for (let y = 0; y < targetH; y++) {
          for (let x = 0; x < targetW; x++) {
            const idx = (y * targetW + x) * 4
            gray[y * targetW + x] =
              (0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2]) / 255
          }
        }
        let edgeCount = 0
        let strongEdges = 0
        for (let y = 1; y < targetH - 1; y++) {
          for (let x = 1; x < targetW - 1; x++) {
            const i = y * targetW + x
            const gx =
              -gray[i - targetW - 1] -
              2 * gray[i - 1] -
              gray[i + targetW - 1] +
              gray[i - targetW + 1] +
              2 * gray[i + 1] +
              gray[i + targetW + 1]
            const gy =
              -gray[i - targetW - 1] -
              2 * gray[i - targetW] -
              gray[i - targetW + 1] +
              gray[i + targetW - 1] +
              2 * gray[i + targetW] +
              gray[i + targetW + 1]
            const mag = Math.sqrt(gx * gx + gy * gy)
            edgeCount += 1
            if (mag > 0.25) strongEdges += 1
          }
        }
        const clutter = Math.min(1, strongEdges / Math.max(1, edgeCount)) // edge density

        let faceCount: number | null = null
        let framing: PhotoAnalysis['framing'] = 'unknown'
        const FaceDetectorCtor = (window as Window & { FaceDetector?: FaceDetectorConstructor })
          .FaceDetector
        if (FaceDetectorCtor) {
          const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 3 })
          const bitmap = await createImageBitmap(canvas)
          const faces = await detector.detect(bitmap)
          faceCount = Array.isArray(faces) ? faces.length : 0
          const first = faces?.[0]
          const box = first?.boundingBox
          if (box && w && h) {
            const faceAreaRatio = (box.width * box.height) / (w * h)
            if (faceAreaRatio > 0.22) framing = 'close'
            else if (faceAreaRatio > 0.08) framing = 'ok'
            else framing = 'far'
          }
        } else if (faceModelRef.current) {
          // Fallback face detection using BlazeFace (TensorFlow.js)
          const model = faceModelRef.current
          const faces = await model.estimateFaces(canvas, false)
          faceCount = Array.isArray(faces) ? faces.length : 0
        }

        const tooDark = brightness < 0.22
        const tooBright = brightness > 0.88
        const faceOk = faceCount === null ? true : faceCount === 1
        const canProceed = faceOk && !tooDark && !tooBright

        const noteParts: string[] = []
        if (faceCount === null) {
          noteParts.push(
            faceModelStatus === 'failed'
              ? 'Face model failed to load.'
              : faceModelStatus === 'loading'
                ? 'Loading face model…'
                : 'Face detection not available.',
          )
        }
        else if (faceCount === 0) noteParts.push('No face detected.')
        else if (faceCount > 1) noteParts.push('More than one face detected.')
        else noteParts.push('One face detected.')
        if (tooDark) noteParts.push('Image looks dark.')
        if (tooBright) noteParts.push('Image looks overexposed.')
        if (framing !== 'unknown') noteParts.push(`Framing: ${framing}.`)

        if (!cancelled) {
          setAnalysis({
            faceCount,
            brightness,
            contrast,
            highlightClip: highlightClipFrac,
            shadowClip: shadowClipFrac,
            clutter,
            framing,
            note: noteParts.join(' '),
            canProceed,
          })
        }
      } catch {
        if (!cancelled) {
          setAnalysis({
            faceCount: null,
            brightness: null,
            contrast: null,
            highlightClip: null,
            shadowClip: null,
            clutter: null,
            framing: 'unknown',
            note: 'Could not analyze this photo. You can retake it.',
            canProceed: true,
          })
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [form.photoUrl, faceModelStatus])

  const confidence = useMemo(() => {
    if (!analysis) return null
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

    // Lighting score from brightness + clipping
    const b = analysis.brightness ?? 0.5
    const bScore = 1 - Math.min(1, Math.abs(b - 0.55) / 0.55)
    const clipPenalty =
      (analysis.highlightClip ?? 0) * 2.2 + (analysis.shadowClip ?? 0) * 1.8
    const lighting = clamp01(bScore - clipPenalty)

    // Clutter score (lower clutter is better)
    const clutter = clamp01(1 - (analysis.clutter ?? 0.25) * 2.0)

    // Face score (prefer exactly 1 face; neutral if detector unavailable)
    let face = 0.65
    if (analysis.faceCount !== null) {
      if (analysis.faceCount === 1) face = 1
      else if (analysis.faceCount === 0) face = 0.15
      else face = 0.25
    }

    const overall = 100 * (0.45 * lighting + 0.30 * clutter + 0.25 * face)

    return Math.round(Math.max(0, Math.min(100, overall)))
  }, [analysis])

  const breakdown = useMemo(() => {
    if (!analysis) return null
    const percent = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100)

    const b = analysis.brightness ?? 0.5
    const bScore = 1 - Math.min(1, Math.abs(b - 0.55) / 0.55)
    const clipPenalty =
      (analysis.highlightClip ?? 0) * 2.2 + (analysis.shadowClip ?? 0) * 1.8
    const lighting = Math.max(0, Math.min(1, bScore - clipPenalty))

    const clutter = Math.max(0, Math.min(1, 1 - (analysis.clutter ?? 0.25) * 2.0))

    let face = 0.65
    if (analysis.faceCount !== null) {
      if (analysis.faceCount === 1) face = 1
      else if (analysis.faceCount === 0) face = 0.15
      else face = 0.25
    }

    return [
      { label: 'Lighting', value: percent(lighting) },
      { label: 'Clutter', value: percent(clutter) },
      { label: 'Face', value: percent(face) },
    ]
  }, [analysis])

  const topBubbles = useMemo(() => {
    const bubbles: { label: string; tone: 'id' | 'field' | 'salary' }[] = []
    if (form.photoUrl) {
      bubbles.push({ label: 'Photo', tone: 'id' })
    }
    if (form.gender) {
      bubbles.push({
        label: genderLabels[form.gender as Exclude<GenderOption, ''>],
        tone: 'id',
      })
    }
    if (form.fieldOfStudy.trim()) {
      bubbles.push({ label: form.fieldOfStudy.trim(), tone: 'field' })
    }
    if (form.expectedSalary.trim()) {
      bubbles.push({
        label: form.expectedSalary,
        tone: 'salary',
      })
    }
    return bubbles
  }, [form.gender, form.photoUrl, form.fieldOfStudy, form.expectedSalary])

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
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="salary">Expected salary (optional)</label>
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
                placeholder="Front-end, Design, Engineering..."
                value={form.fieldOfStudy}
                onChange={(e) => onChange('fieldOfStudy', e.target.value)}
              />
            </div>
          </div>

          <div className="camera-below">
            {!form.photoUrl ? (
              <CameraCapture photoUrl={form.photoUrl} onPhotoChange={onPhotoChange} />
            ) : (
              <div className="camera-after">
                <span className="camera-after-label" aria-hidden="true">
                  📷 Photo captured
                </span>
                <button
                  type="button"
                  className="camera-icon-button"
                  onClick={() => onPhotoChange(null)}
                >
                  Retake
                </button>
              </div>
            )}

            {analysis && (
              <div className="confidence">
                <div className="confidence-row">
                  <span className="confidence-label">Confidence level</span>
                  <strong className="confidence-value">
                    {confidence === null ? '—' : `${confidence}%`}
                  </strong>
                </div>
                <div className="confidence-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={confidence ?? undefined}>
                  <div className="confidence-fill" style={{ width: `${confidence ?? 0}%` }} />
                </div>
                <p className="confidence-note">{analysis.note}</p>
                {breakdown && (
                  <ul className="confidence-breakdown">
                    {breakdown.map((row) => (
                      <li key={row.label}>
                        <span>{row.label}</span>
                        <strong>{row.value}%</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
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

type CameraCaptureProps = {
  photoUrl: string | null
  onPhotoChange: (photoUrl: string | null) => void
}

function CameraCapture({ photoUrl, onPhotoChange }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<
    'idle' | 'requesting' | 'ready' | 'blocked' | 'unsupported'
  >('idle')

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => {
    return () => stopStream()
  }, [])

  const enableCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }
    setStatus('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setStatus('ready')
    } catch {
      setStatus('blocked')
    }
  }

  const takePhoto = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    const width = Math.max(1, video.videoWidth || 640)
    const height = Math.max(1, video.videoHeight || 480)
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    onPhotoChange(dataUrl)
    stopStream()
    setStatus('idle')
  }

  return (
    <div className="camera-mini">
      <div className="camera-mini-row">
        <span className="camera-mini-label" aria-hidden="true">
          📷
        </span>
        <div className="camera-mini-actions">
          {!photoUrl && status !== 'ready' && (
            <button
              type="button"
              className="camera-icon-button"
              onClick={enableCamera}
              disabled={status === 'requesting'}
              aria-label="Enable camera"
              title="Enable camera"
            >
              {status === 'requesting' ? '…' : 'Enable'}
            </button>
          )}
          {status === 'ready' && (
            <button
              type="button"
              className="camera-icon-button camera-icon-button--primary"
              onClick={takePhoto}
              aria-label="Take photo"
              title="Take photo"
            >
              Shot
            </button>
          )}
          {photoUrl && (
            <button
              type="button"
              className="camera-icon-button"
              onClick={() => onPhotoChange(null)}
              aria-label="Retake photo"
              title="Retake"
            >
              Retake
            </button>
          )}
        </div>
      </div>

      <div className="camera-frame camera-frame--mini">
        {photoUrl ? (
          <img className="camera-photo" src={photoUrl} alt="Captured photo" />
        ) : (
          <video className="camera-video" ref={videoRef} playsInline muted />
        )}

        {status === 'blocked' && (
          <p className="camera-hint">
            Camera permission was blocked. Allow it in your browser site settings and try again.
          </p>
        )}
        {status === 'unsupported' && (
          <p className="camera-hint">
            Your browser doesn&apos;t support camera capture. Try Chrome, or use another device.
          </p>
        )}
        {status !== 'ready' && !photoUrl && status !== 'blocked' && status !== 'unsupported' && (
          <p className="camera-hint">Tap “Enable”, then “Shot”</p>
        )}
      </div>
    </div>
  )
}

type ResultSceneProps = {
  form: FormState
  result: ResultData
  onRestart: () => void
}

function ResultScene({ form, result, onRestart }: ResultSceneProps) {
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 12, y: -18 })
  const [activeStoryStep, setActiveStoryStep] = useState(0)
  const storyRefs = useRef<Array<HTMLElement | null>>([])
  const [leavingStep, setLeavingStep] = useState<number | null>(null)
  const [leavingKey, setLeavingKey] = useState(0)

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
  const gender = form.gender

  const headline = 'Here is your position.'

  const suggestions = buildSuggestions(gender, form.fieldOfStudy)

  // Scroll-driven story: observe which section is active
  useEffect(() => {
    const nodes = storyRefs.current.filter(Boolean) as HTMLElement[]
    if (nodes.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0]
        if (!visible) return
        const idx = Number((visible.target as HTMLElement).dataset.stepIndex ?? '0')
        if (!Number.isNaN(idx)) setActiveStoryStep(idx)
      },
      // activate when section crosses the middle band
      { threshold: [0.2, 0.35, 0.5], rootMargin: '-35% 0px -45% 0px' },
    )

    nodes.forEach((n) => observer.observe(n))
    return () => observer.disconnect()
  }, [suggestions.length])

  // Card transition: when scroll-driven step changes, show previous card leaving briefly.
  const prevStepRef = useRef(activeStoryStep)
  useEffect(() => {
    const prev = prevStepRef.current
    if (prev !== activeStoryStep) {
      // Sync updates: deferring with setTimeout(0) breaks under Strict Mode — effect cleanup
      // clears timers before they run, so the leaving card never appears in dev.
      setLeavingStep(prev)
      setLeavingKey((k) => k + 1)
      const t = window.setTimeout(() => setLeavingStep(null), 320)
      prevStepRef.current = activeStoryStep
      return () => window.clearTimeout(t)
    }
    prevStepRef.current = activeStoryStep
  }, [activeStoryStep])

  const levelCount = 5
  const maxIndex = levelCount - 1
  const currentRatio = result.currentLevel / maxIndex
  const expectedRatio = result.expectedLevel / maxIndex
  const currentPercent = 8 + currentRatio * 80
  const expectedPercent = 8 + expectedRatio * 80

  const storyStepPercent = useMemo(() => {
    // Map 0..3 => 8%, 32%, 56%, 80% (4 steps)
    const clamped = Math.max(0, Math.min(3, activeStoryStep))
    return 8 + (clamped / 3) * 72
  }, [activeStoryStep])

  return (
    <section className="panel panel-result">
      <header className="panel-header">
        <h2>{headline}</h2>
      </header>

      <div className="story-layout">
        <div className="story-left">
          <div className="pyramid-wrapper pyramid-wrapper--sticky">
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
                '--story-pos': `${storyStepPercent}%`,
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
                {form.photoUrl && (
                  <div className="pyramid-human pyramid-human--story">
                    <div className="pyramid-avatar pyramid-avatar--story">
                      <img src={form.photoUrl} alt="Your story position" />
                    </div>
                  </div>
                )}
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
        </div>

        <div className="story-right">
          <div className="story-scroll">
            <div className="story-pinned">
              <div className="story-stage">
                {leavingStep !== null && leavingStep !== activeStoryStep && (
                  <StoryCard
                    key={`leave-${leavingKey}-${leavingStep}`}
                    item={suggestions[leavingStep]}
                    state="leaving"
                  />
                )}
                <StoryCard
                  key={`active-${activeStoryStep}`}
                  item={suggestions[activeStoryStep]}
                  state="active"
                />
              </div>

              <div className="story-footer">
                <button className="secondary-button" onClick={onRestart}>
                  Spin again with a different profile
                </button>
              </div>
            </div>

            <div className="story-markers" aria-hidden="true">
              {suggestions.slice(0, 4).map((_, idx) => (
                <div
                  key={idx}
                  className="story-marker"
                  ref={(el) => {
                    storyRefs.current[idx] = el
                  }}
                  data-step-index={idx}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StoryCard({
  item,
  state,
}: {
  item: Suggestion
  state: 'active' | 'leaving'
}) {
  return (
    <div className={`story-cardPinned ${state}`}>
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
