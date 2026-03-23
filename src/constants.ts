import type { GenderOption } from './types'

export const DEFAULT_SALARY = 3200
export const MAX_SALARY = 8000
export const MIN_SALARY = 1200

/** Number of discrete salary steps on the pyramid (0 .. count - 1). */
export const PYRAMID_LEVEL_COUNT = 5

/** Horizontal stair treads (fewer = each tread looks “wider” / taller on the face). */
export const PYRAMID_VISUAL_STAIRS = 10

export const genderLabels: Record<Exclude<GenderOption, ''>, string> = {
  woman: 'Woman',
  man: 'Man',
  'non-binary': 'Non-binary / Other',
}
