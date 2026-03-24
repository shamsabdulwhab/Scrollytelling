import type { FormState } from '../types'

/** True when a gender option is chosen — required before submit and for salary gap math. */
export function isGenderSelected(form: FormState): boolean {
  return form.gender !== ''
}
