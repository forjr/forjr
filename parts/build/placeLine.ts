import type { Description } from '../core/internal.ts'
import { isStored } from '../core/internal.ts'

/** Where a definition stands in its file: the line of its first character and of its last, and its text between them. */
export interface DefinitionAt {
  file: string
  line: number
  last: number
  text: string
}

/**
 * Takes a text and a place in it of a character that is counted with one line ending, as a description counts it.
 * Answers where that character stands in the text as it is written, with a line ending of two characters or one.
 */
export function rawAt(text: string, at: number): number {
  let seen = 0
  for (let k = 0; k < text.length; k++) {
    if (text[k] === '\r' && text[k + 1] === '\n') continue
    if (seen === at) return k
    seen += 1
  }
  return text.length
}

/** The line of a place in a text as it is written: a line ending of two characters is one. */
const lineAt = (text: string, at: number): number => text.slice(0, at).split('\n').length

/**
 * Takes a description and the text of each file of the project, by its path, with or without its tree. Answers each
 * definition that the description places, by its name: its file, the line of its first character and of its last,
 * and its text between the two ends of its place, as the file writes it. No line is added to the description.
 */
export function linesOf(
  description: Description,
  source: Record<string, { text: string }>,
): Record<string, DefinitionAt> {
  const found: Record<string, DefinitionAt> = {}
  for (const [name, place] of Object.entries(description.places ?? {})) {
    if (!isStored(place) || typeof place.file !== 'string') continue
    const text = source[place.file]?.text
    if (text === undefined || typeof place.from !== 'number' || typeof place.to !== 'number') continue
    const [from, to] = [rawAt(text, place.from), rawAt(text, place.to)]
    found[name] = { file: place.file, line: lineAt(text, from), last: lineAt(text, to), text: text.slice(from, to + 1) }
  }
  return found
}
