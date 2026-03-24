import { DEFAULT_SALARY, MAX_SALARY, MIN_SALARY, PYRAMID_LEVEL_COUNT } from '../constants'
import type { GenderOption } from '../types'

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Rough “adjusted” salary used in the demo (depends on gender) */
export function computeGap(gender: GenderOption, rawSalary: number): number {
  if (!rawSalary || Number.isNaN(rawSalary)) return DEFAULT_SALARY
  const clamped = clamp(rawSalary, MIN_SALARY, MAX_SALARY)

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

/** Map salary to a pyramid step 0 .. PYRAMID_LEVEL_COUNT - 1 */
export function mapSalaryToLevel(salary: number): number {
  const ratio =
    (clamp(salary || DEFAULT_SALARY, MIN_SALARY, MAX_SALARY) - MIN_SALARY) /
    (MAX_SALARY - MIN_SALARY)
  return Math.round(ratio * (PYRAMID_LEVEL_COUNT - 1))
}
