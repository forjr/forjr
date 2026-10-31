import { rawAt } from '../../build/index.ts'
import type { Description } from '../../core/internal.ts'

/**
 * Takes a description, the name of a definition and the text of the file that holds it. Answers where in that
 * text the definition stands: from the first character of its `export` to the bracket that closes its word, or
 * nothing where the description places it nowhere.
 */
export function placeOf(
  description: Description | undefined,
  name: string,
  text: string,
): { from: number; to: number } | undefined {
  const place: unknown = Reflect.get(Object(Reflect.get(Object(description), 'places')), name)
  const from: unknown = Reflect.get(Object(place), 'from')
  const to: unknown = Reflect.get(Object(place), 'to')
  if (typeof from !== 'number' || typeof to !== 'number') return undefined
  return { from: rawAt(text, from), to: rawAt(text, to) }
}
