import type { GenderOption } from '../types'

export type CameraInferredProfile = {
  gender: Exclude<GenderOption, ''>
  ethnicityLabel: string
  ageRange: string
}

/** Deterministic demo labels — not real demographic classification. */
const ETHNICITY_POOL = [
  'South Asian (demo)',
  'East Asian (demo)',
  'European (demo)',
  'Sub-Saharan (demo)',
  'MENA region (demo)',
  'Latine (demo)',
  'Mixed / ambiguous (demo)',
] as const

function mix32(n: number): number {
  let x = n >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d)
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b)
  return (x ^ (x >>> 16)) >>> 0
}

export function hashPixels(data: Uint8ClampedArray, sampleLen = 768): number {
  let h = 2166136261
  const step = Math.max(1, Math.floor(data.length / sampleLen))
  for (let i = 0; i < data.length; i += step) {
    h ^= data[i]
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function inferCameraProfile(seed: number): CameraInferredProfile {
  const g = mix32(seed) % 3
  const gender: Exclude<GenderOption, ''> =
    g === 0 ? 'woman' : g === 1 ? 'man' : 'non-binary'

  const eIdx = mix32(seed + 1) % ETHNICITY_POOL.length
  const ethnicityLabel = ETHNICITY_POOL[eIdx]

  const mid = 24 + (mix32(seed + 2) % 28)
  const span = 3 + (mix32(seed + 3) % 5)
  const ageRange = `${mid - span}–${mid + span} years`

  return { gender, ethnicityLabel, ageRange }
}
