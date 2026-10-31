import type { Description, Uses } from '../../core/internal.ts'
import { usesOf } from '../../core/internal.ts'

// The graph of each description the impact holds, made once: the impact reads descriptions alone, never the code.
const graphs = new WeakMap<Description, Uses>()

/** The graph of who uses what of a description, with nothing seen in code. */
export function usesIn(description: Description): Uses {
  const held = graphs.get(description)
  if (held) return held
  const made = usesOf(description)
  graphs.set(description, made)
  return made
}
