import type { Description } from '../../core/internal.ts'
import { definitionsOf } from '../../core/internal.ts'
import { usesIn } from './graph.ts'

/**
 * Takes a description and the name of a definition, or of a column, a step or a tool by its owner's. Answers its
 * kind, as its node in the graph names it, and the file it lies in: the one `definitionsOf` places it in, a
 * backfill by its place in `places`. A name that stands for nothing is a `definition` of no file.
 */
export function placedIn(description: Description, name: string): { kind: string; file: string } {
  const owner = name.split('.')[0]
  const place: unknown = Reflect.get(Object(description.places), owner)
  const file = definitionsOf(description).get(owner)?.file ?? Reflect.get(Object(place), 'file')
  return {
    kind: usesIn(description).nodes.get(owner)?.kind ?? 'definition',
    file: typeof file === 'string' ? file : '',
  }
}
