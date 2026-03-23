import type { GenderOption } from './types'

export const DEFAULT_SALARY = 3200
export const MAX_SALARY = 8000
export const MIN_SALARY = 1200

/**
 * Labels under the pyramid (left → right = bottom → top of the triangle).
 * Salary maps to index 0 .. length - 1. To add a level: add a string here — no other edits needed.
 */
export const PYRAMID_STEP_LABELS = [
  'Base',
  'Entry',
  'Mid',
  'Senior',
  'Top',
] as const

export const PYRAMID_LEVEL_COUNT = PYRAMID_STEP_LABELS.length

/** Horizontal stair treads (fewer = each tread looks “wider” / taller on the face). */
export const PYRAMID_VISUAL_STAIRS = 10

export const genderLabels: Record<Exclude<GenderOption, ''>, string> = {
  woman: 'Woman',
  man: 'Man',
  'non-binary': 'Non-binary / Other',
}
