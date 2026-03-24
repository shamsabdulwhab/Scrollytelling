const KEY = 'gender-app-camera-saved-v1'

export type CameraSavedSnapshot = {
  cameraSavedEthnicity?: string
  cameraSavedAgeRange?: string
  cameraSavedConfidence?: number
  cameraSavedModelGender?: string
  cameraSavedSuggestedGender?: 'woman' | 'man'
}

export function loadCameraSavedSnapshot(): CameraSavedSnapshot {
  if (typeof sessionStorage === 'undefined') return {}
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return {}
    return JSON.parse(raw) as CameraSavedSnapshot
  } catch {
    return {}
  }
}

export function persistCameraSavedSnapshot(snapshot: CameraSavedSnapshot): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    // Quota or private mode
  }
}

export function clearCameraSavedSnapshot(): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
