import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { filesImported, linesOf, seenInCode } from '../../build/index.ts'
import { boolean, number, text } from '../../core/index.ts'
import type { Description, MapInput } from '../../core/internal.ts'
import { isStored, mapOf, mapWord } from '../../core/internal.ts'
import { touchedIn } from '../../publish/index.ts'
import { pathIn } from '../paths.ts'
import { describedNow } from '../written.ts'
import type { ProjectTool } from './face.ts'
import { shownFile } from './shown.ts'

/**
 * The text of each file a description places a definition in, read as the tool `read` reads it, for a workspace in
 * its box, which the program of the product never parses. A file that `pathIn` refuses, as a link or a place out of
 * the project, is left out, so its definitions stand with no line.
 */
export function boxTexts(project: string, description: Description): Record<string, { text: string }> {
  const files = new Set(
    Object.values(description.places).flatMap((one) =>
      isStored(one) && typeof one.file === 'string' ? [one.file] : [],
    ),
  )
  const texts: Record<string, { text: string }> = {}
  for (const file of files) {
    let place: string
    try {
      place = pathIn(project, file, { writes: false })
    } catch {
      continue
    }
    if (existsSync(place) && statSync(place).isFile()) texts[file] = { text: readFileSync(place, 'utf8') }
  }
  return texts
}

/**
 * `map`: the map of the project as data, as `forjr map --json` answers it, with no bytes of the page: each definition
 * with its file and line, who may call it, what it reads and writes, who uses it and its tests; or one definition, one
 * column or one file by `name`. The text of a definition is given only where the policy's `read` shows its file.
 */
export const mapTool: ProjectTool = {
  name: 'map',
  about:
    "The app's map: each definition with its file and line, who may call it, what it reads and writes, who uses it and its tests. Name a definition, a column or a file for that one alone.",
  input: {
    name: text({ optional: true }),
    size: number({ optional: true, whole: true, min: 1 }),
    all: boolean({ optional: true }),
  },
  writes: false,
  async run(at, input) {
    const { description, source, findings } = await describedNow(at)
    if (!description) return { findings }
    const project = at.one.folders.project
    const lines = linesOf(description, source ?? boxTexts(project, description))
    // The text of a definition is a reading of its file, which the policy's `read` shows or holds back.
    const placed: MapInput['at'] = {}
    for (const [name, one] of Object.entries(lines))
      placed[name] = (await shownFile(at, one.file)) ? one : { file: one.file, line: one.line, last: one.last }
    const tests = touchedIn(join(project, '.forjr'))
    const made: MapInput = {
      description,
      at: placed,
      ...(source ? { seen: seenInCode(description, source), imports: filesImported(source) } : { box: true }),
      ...(tests ? { tests } : {}),
    }
    if (typeof input.name === 'string') return mapWord(made, input.name)
    const size = input.all === true ? 'all' : typeof input.size === 'number' ? input.size : undefined
    return mapOf({ ...made, ...(size === undefined ? {} : { size }) })
  },
}
