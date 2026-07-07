import type { MealType } from './backend/types'

/** Sensible default mission for the current time of day. */
export function defaultMealType(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h >= 17 && h < 21) return 'dinner'
  return 'snack'
}
