export type GenderOption = 'woman' | 'man' | 'non-binary' | ''

export type FormState = {
  displayName: string
  gender: GenderOption
  expectedSalary: string
  fieldOfStudy: string
  photoUrl: string | null
  /** Filled when user taps Edit on camera insights (demo estimates). */
  cameraSavedEthnicity?: string
  cameraSavedAgeRange?: string
  cameraSavedConfidence?: number
}

export type ResultData = {
  normalizedExpected: number
  adjustedSalary: number
  gapAmount: number
  gapPercent: number
  currentLevel: number
  expectedLevel: number
}

export type Stage = 'intro' | 'form' | 'result'

/** Experimental API; not in all `lib.dom` versions as `Window` member */
export type FaceDetectorConstructor = new (options?: {
  fastMode?: boolean
  maxDetectedFaces?: number
}) => {
  detect(image: ImageBitmapSource): Promise<Array<{ boundingBox?: DOMRectReadOnly }>>
}
