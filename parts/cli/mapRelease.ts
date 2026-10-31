import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Source } from '../build/index.ts'
import { buildProject, describeProject, filesImported, linesOf, seenInCode } from '../build/index.ts'
import type { Finding } from '../core/index.ts'
import type { Description, MapAnswer, MapInput, PageBytes } from '../core/internal.ts'
import { mapOf, mapWord, pageBytesOf } from '../core/internal.ts'
import { touchedIn } from '../publish/index.ts'
import { guardOf } from './guarded.ts'

/** What `forjr map` is asked: a word, a size in tokens, or the whole map. */
export interface MapAsked {
  name?: string
  size?: number
  all?: boolean
}

/** What the map was asked, read from the words of the command or of the admin channel: a name, a size, or all. */
export function mapAskedOf(args: object): MapAsked {
  const [name, size, all] = ['name', 'size', 'all'].map((one) => Reflect.get(args, one))
  return {
    ...(typeof name === 'string' ? { name } : {}),
    ...(typeof size === 'number' ? { size } : {}),
    ...(all === true ? { all: true } : {}),
  }
}

/** The bytes of each file of a bundle, by its path in the bundle. */
const sizesIn = (folder: string): Record<string, number> =>
  Object.fromEntries(
    readdirSync(folder, { recursive: true, withFileTypes: true })
      .filter((one) => one.isFile())
      .map((one) => {
        const lies = join(one.parentPath, one.name)
        return [lies.slice(folder.length + 1).replaceAll('\\', '/'), statSync(lies).size]
      }),
  )

/** What a release build made for the map gives it: the description, the source and the bytes of the page. */
type Released = { description: Description; source: Source; page: PageBytes } | { page: 'unbuilt'; findings: Finding[] }

/**
 * Takes the folder of a project. Builds it for release into a folder of its own under the system's folder for
 * temporary files, reads its description, its source and the bytes of each file of its bundle, and removes the
 * folder, whatever happened: no bundle is left in the project or beside it. Answers what the map reads of it, or
 * `'unbuilt'` with the errors where the release build found any.
 */
export async function releasedForMap(folder: string): Promise<Released> {
  const out = mkdtempSync(join(tmpdir(), 'forjr-map-'))
  try {
    const built = await buildProject(folder, { for: 'release', out: join(out, 'bundle'), ...guardOf(folder) })
    const errors = built.findings.filter((one) => one.level === 'error')
    if (errors.length || !built.bundleFolder) return { page: 'unbuilt', findings: errors }
    const page = pageBytesOf(built.description, sizesIn(built.bundleFolder))
    return { description: built.description, source: built.source, page }
  } finally {
    rmSync(out, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  }
}

/**
 * Takes the folder of a project, a description and the source it was described from. Answers what the map is made
 * from: what is seen in the code, the line of each definition, the files each file imports, and the record of the
 * tests where `forjr test` keeps it, in the project's own `.forjr/` whatever data folder a command names.
 */
export function mapInputOf(folder: string, description: Description, source: Source): MapInput {
  const tests = touchedIn(join(folder, '.forjr'))
  return {
    description,
    seen: seenInCode(description, source),
    at: linesOf(description, source),
    imports: filesImported(source),
    ...(tests ? { tests } : {}),
  }
}

/** Takes what the map is made from and what it was asked. Answers the map of the app, or the one thing a word names. */
export const mapAsked = (input: MapInput, asked: MapAsked): MapAnswer =>
  asked.name === undefined
    ? mapOf({ ...input, ...(asked.all ? { size: 'all' as const } : asked.size ? { size: asked.size } : {}) })
    : mapWord(input, asked.name)

/** Whether an answer needs no bytes of the page: a column, and a file that holds no definition. */
export const needsNoPage = (answer: MapAnswer): boolean => 'column' in answer || 'importedBy' in answer

/**
 * Takes the folder of a project and what the map was asked. Makes the map from the files: a word read as a column or
 * as a file that holds no definition from the project described alone, anything else from a release build made for
 * the map, and a project that cannot be built for release as it is described, with its errors as the findings.
 * Throws F0001 for a word that names nothing.
 */
export async function mapMade(folder: string, asked: MapAsked): Promise<{ value: MapAnswer; findings: Finding[] }> {
  const errorsOf = (findings: Finding[]): Finding[] => findings.filter((one) => one.level === 'error')
  if (asked.name !== undefined) {
    const described = await describeProject(folder)
    const first = mapAsked(mapInputOf(folder, described.description, described.source), asked)
    if (needsNoPage(first)) return { value: first, findings: errorsOf(described.findings) }
  }
  const released = await releasedForMap(folder)
  if (released.page !== 'unbuilt') {
    const input = { ...mapInputOf(folder, released.description, released.source), page: released.page }
    return { value: mapAsked(input, asked), findings: [] }
  }
  const described = await describeProject(folder)
  const input = { ...mapInputOf(folder, described.description, described.source), page: 'unbuilt' as const }
  return { value: mapAsked(input, asked), findings: released.findings }
}
