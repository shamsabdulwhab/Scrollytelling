import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as blazeface from '@tensorflow-models/blazeface'
import * as tf from '@tensorflow/tfjs'
import { BackArrowButton } from '../components/BackArrowButton'
import { CameraCapture } from '../components/CameraCapture'
import type { FaceDetectorConstructor, FormState, GenderOption } from '../types'
import { hashPixels, inferCameraProfile } from '../utils/cameraInference'

const STUDY_OPTIONS = [
  'Front-End Dev',
  'Design',
  'Engineering',
  'Data / Analytics',
] as const

const DEFAULT_AVATAR_PLACEHOLDER = `${import.meta.env.BASE_URL}Ellipse%201.png`

export type FormSceneProps = {
  form: FormState
  hasGenderError: boolean
  onChange: (field: keyof FormState, value: string) => void
  onPhotoChange: (photoUrl: string | null) => void
  /** Applies inferred gender to the form and saves ethnicity / age / confidence for the bottom summary. */
  onApplyCameraSave: (payload: {
    gender: Exclude<GenderOption, ''>
    ethnicity: string
    ageRange: string
    confidence: number
  }) => void
  /** Clears the bottom “Saved from camera” panel (photo and gender stay; user can save again). */
  onClearCameraSaved: () => void
  onSubmit: (event: FormEvent) => void
  onBack: () => void
}

type PhotoAnalysis = {
  faceCount: number | null
  brightness: number | null
  contrast: number | null
  highlightClip: number | null
  shadowClip: number | null
  clutter: number | null
  framing: 'close' | 'ok' | 'far' | 'unknown'
  note: string
  canProceed: boolean
  /** Hash seed for deterministic demo ethnicity / gender / age labels. */
  seed: number
}

function genderOptionLabel(g: GenderOption): string {
  if (g === 'woman') return 'Female'
  if (g === 'man') return 'Male'
  if (g === 'non-binary') return 'Non-binary / Other'
  return '—'
}

export function FormScene({
  form,
  hasGenderError,
  onChange,
  onPhotoChange,
  onApplyCameraSave,
  onClearCameraSaved,
  onSubmit,
  onBack,
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
        const contrast = Math.min(1, Math.sqrt(variance) / 0.5)
        const highlightClipFrac = highlightClip / n
        const shadowClipFrac = shadowClip / n

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
        const clutter = Math.min(1, strongEdges / Math.max(1, edgeCount))

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
        } else if (faceCount === 0) noteParts.push('No face detected.')
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
            seed: hashPixels(imgData.data),
          })
        }
      } catch {
        if (!cancelled) {
          let fallbackSeed = 2166136261
          for (let i = 0; i < photoUrl.length; i++) {
            fallbackSeed = Math.imul(fallbackSeed ^ photoUrl.charCodeAt(i), 16777619) >>> 0
          }
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
            seed: fallbackSeed,
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

    const b = analysis.brightness ?? 0.5
    const bScore = 1 - Math.min(1, Math.abs(b - 0.55) / 0.55)
    const clipPenalty =
      (analysis.highlightClip ?? 0) * 2.2 + (analysis.shadowClip ?? 0) * 1.8
    const lighting = clamp01(bScore - clipPenalty)

    const clutter = clamp01(1 - (analysis.clutter ?? 0.25) * 2.0)

    let face = 0.65
    if (analysis.faceCount !== null) {
      if (analysis.faceCount === 1) face = 1
      else if (analysis.faceCount === 0) face = 0.15
      else face = 0.25
    }

    const overall = 100 * (0.45 * lighting + 0.3 * clutter + 0.25 * face)

    return Math.round(Math.max(0, Math.min(100, overall)))
  }, [analysis])

  const inferredProfile = useMemo(() => {
    if (!analysis) return null
    return inferCameraProfile(analysis.seed)
  }, [analysis])

  function handleCameraSave() {
    if (!inferredProfile || confidence === null) return
    onApplyCameraSave({
      gender: inferredProfile.gender,
      ethnicity: inferredProfile.ethnicityLabel,
      ageRange: inferredProfile.ageRange,
      confidence,
    })
  }

  const cameraInsightsSaved =
    form.cameraSavedEthnicity != null ||
    form.cameraSavedAgeRange != null ||
    form.cameraSavedConfidence != null

  return (
    <section className="form-page">
      <div className="form-page__accent form-page__accent--gold" aria-hidden="true" />
      <div className="form-page__accent form-page__accent--pink form-page__accent--pink-a" aria-hidden="true" />
      <div className="form-page__accent form-page__accent--pink form-page__accent--pink-b" aria-hidden="true" />

      <div className="form-page__back">
        <BackArrowButton onClick={onBack} label="Back to intro" />
      </div>

      <h1 className="form-page__headline">Let&apos;s make this personal</h1>

      <div className="form-page__avatar">
        {!form.photoUrl ? (
          <CameraCapture
            className="camera-mini--profile"
            placeholderSrc={DEFAULT_AVATAR_PLACEHOLDER}
            photoUrl={form.photoUrl}
            onPhotoChange={onPhotoChange}
          />
        ) : (
          <div className="form-page__avatar-preview">
            <img src={form.photoUrl} alt="" className="form-page__avatar-img" />
            <button
              type="button"
              className="form-page__avatar-reshot"
              onClick={() => onPhotoChange(null)}
            >
              Reshot
            </button>
          </div>
        )}
      </div>

      <form className="form-page__form" onSubmit={onSubmit} noValidate>
        <div className="form-page__row">
          <div className="form-page__field">
            <div className="form-page__label-row">
              <label htmlFor="displayName">Name</label>
            </div>
            <input
              id="displayName"
              type="text"
              autoComplete="name"
              placeholder="Enter your name"
              value={form.displayName}
              onChange={(e) => onChange('displayName', e.target.value)}
            />
          </div>

          <div className={`form-page__field ${hasGenderError ? 'form-page__field--error' : ''}`}>
            <div className="form-page__label-row">
              <label htmlFor="gender">Gender</label>
            </div>
            <div className="form-page__select-wrap">
              <select
                id="gender"
                className="form-page__select"
                value={form.gender}
                onChange={(e) => onChange('gender', e.target.value as GenderOption)}
              >
                <option value="">Select gender</option>
                <option value="woman">Female</option>
                <option value="man">Male</option>
                <option value="non-binary">Non-binary / Other</option>
              </select>
              <span className="form-page__select-arrow" aria-hidden="true">
                ▼
              </span>
            </div>
            {hasGenderError && <p className="form-page__error">Please choose a gender to continue.</p>}
          </div>

          <div className="form-page__field">
            <div className="form-page__label-row">
              <label htmlFor="salary">Expected salary</label>
            </div>
            <input
              id="salary"
              type="text"
              inputMode="decimal"
              placeholder="€3200"
              value={form.expectedSalary}
              onChange={(e) => onChange('expectedSalary', e.target.value)}
            />
          </div>

          <div className="form-page__field">
            <div className="form-page__label-row">
              <label htmlFor="field">Field of study</label>
            </div>
            <div className="form-page__select-wrap">
              <select
                id="field"
                className="form-page__select"
                value={form.fieldOfStudy}
                onChange={(e) => onChange('fieldOfStudy', e.target.value)}
              >
                <option value="">Select field</option>
                {STUDY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <span className="form-page__select-arrow" aria-hidden="true">
                ▼
              </span>
            </div>
          </div>
        </div>

        {form.photoUrl && analysis && inferredProfile && confidence !== null && (
          <div className="form-page__insights">
            <p className="form-page__insights-disclaimer">
              Demo estimates from your photo — not identity verification.
            </p>
            <dl className="form-page__insights-grid">
              <div className="form-page__insights-row">
                <dt>Ethnicity</dt>
                <dd>{inferredProfile.ethnicityLabel}</dd>
              </div>
              <div className="form-page__insights-row">
                <dt>Gender</dt>
                <dd>{genderOptionLabel(inferredProfile.gender)}</dd>
              </div>
              <div className="form-page__insights-row">
                <dt>Expected age</dt>
                <dd>{inferredProfile.ageRange}</dd>
              </div>
              <div className="form-page__insights-row form-page__insights-row--confidence">
                <dt>Confidence</dt>
                <dd>
                  <span className="form-page__insights-pct">
                    {String(confidence).padStart(2, '0')}%
                  </span>
                  <div
                    className="confidence-meter form-page__insights-meter"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={confidence}
                  >
                    <div className="confidence-fill" style={{ width: `${confidence}%` }} />
                  </div>
                </dd>
              </div>
            </dl>
            <div className="form-page__insights-actions">
              {cameraInsightsSaved ? (
                <span className="form-page__insights-saved" role="status">
                  Saved
                </span>
              ) : (
                <button type="button" className="form-page__insights-save" onClick={handleCameraSave}>
                  Save
                </button>
              )}
            </div>
          </div>
        )}

        {(form.cameraSavedEthnicity != null ||
          form.cameraSavedAgeRange != null ||
          form.cameraSavedConfidence != null) && (
          <div className="form-page__saved-summary" aria-live="polite">
            <div className="form-page__saved-header">
              <h3 className="form-page__saved-title">Saved from camera</h3>
              <button
                type="button"
                className="form-page__saved-dismiss"
                onClick={onClearCameraSaved}
                aria-label="Dismiss saved camera summary"
              >
                ×
              </button>
            </div>
            <ul className="form-page__saved-list">
              {form.cameraSavedEthnicity != null && (
                <li>
                  <span className="form-page__saved-key">Ethnicity</span>
                  <span className="form-page__saved-val">{form.cameraSavedEthnicity}</span>
                </li>
              )}
              {form.cameraSavedAgeRange != null && (
                <li>
                  <span className="form-page__saved-key">Expected age</span>
                  <span className="form-page__saved-val">{form.cameraSavedAgeRange}</span>
                </li>
              )}
              {form.cameraSavedConfidence != null && (
                <li>
                  <span className="form-page__saved-key">Confidence</span>
                  <span className="form-page__saved-val">
                    {String(form.cameraSavedConfidence).padStart(2, '0')}%
                  </span>
                </li>
              )}
            </ul>
            <p className="form-page__saved-hint">
              Gender is filled in the field above. Use &quot;Discover your worth&quot; to continue.
            </p>
          </div>
        )}

        <div className="form-page__footer">
          <button type="submit" className="form-page__cta">
            Discover your worth
          </button>
        </div>
      </form>
    </section>
  )
}
