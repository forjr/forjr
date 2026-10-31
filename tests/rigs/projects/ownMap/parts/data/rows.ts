import { core } from '../core/index.ts'

/** The rows of the data, counted. */
export function rows(): number {
  return core() * 2
}
