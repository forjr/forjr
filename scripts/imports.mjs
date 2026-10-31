// Holds the imports of the parts against the table of which part may use which, and against the entry files.
// Run: node scripts/imports.mjs [folder]      Ends with 1 when it finds something.
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { heldFiles } from './held.mjs'
import { importsIn, resolvedFrom } from './importsOf.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const folder = process.argv[2] ?? root

const found = []

/**
 * Reads the table of the parts, `parts/parts.json`: for each part the parts it may use, or `null` for every part.
 * Holds the parts and the names of each `uses` to the order of the names, and each name of a `uses` to the parts of
 * the file.
 */
function tableOfParts() {
  const file = join(folder, 'parts', 'parts.json')
  if (!existsSync(file)) {
    if (existsSync(join(folder, 'parts'))) found.push('parts/parts.json  the table of the parts is not there')
    return new Map()
  }
  const table = JSON.parse(readFileSync(file, 'utf8'))
  const parts = Object.keys(table)
  const mayUse = new Map()
  for (const [k, part] of parts.entries()) {
    if (k && parts[k - 1] > part)
      found.push(
        `parts/parts.json  "${part}" stands after "${parts[k - 1]}", and the parts stand in the order of their names`,
      )
    const uses = table[part]?.uses
    mayUse.set(part, uses === 'every part' ? null : Array.isArray(uses) ? uses : [])
  }
  for (const [part, names] of mayUse)
    for (const [k, name] of (names ?? []).entries()) {
      if (!mayUse.has(name))
        found.push(`parts/parts.json  the uses of ${part} name ${name}, which is no part of the file`)
      if (k && names[k - 1] > name)
        found.push(
          `parts/parts.json  the uses of ${part} name ${name} after ${names[k - 1]}, and they stand in the order of their names`,
        )
    }
  return mayUse
}

/** Reads the entry files of a tree, each under its import, and holds the order of the lines and that each file is there. */
function entryFiles() {
  const file = join(folder, 'parts', 'entries.json')
  if (!existsSync(file)) {
    if (existsSync(join(folder, 'parts'))) found.push('parts/entries.json  the file of the entry files is not there')
    return {}
  }
  const entries = JSON.parse(readFileSync(file, 'utf8'))
  const names = Object.keys(entries)
  for (const [k, name] of names.entries()) {
    if (k && names[k - 1] > name)
      found.push(
        `parts/entries.json  "${name}" stands after "${names[k - 1]}", and the lines stand in the order of their names`,
      )
    if (!/^parts\/[^/]+\/./.test(entries[name]) || !existsSync(join(folder, entries[name])))
      found.push(`parts/entries.json  "${name}" names ${entries[name]}, which is no file of a part`)
  }
  return entries
}

const mayUse = tableOfParts()
const entries = entryFiles()
const entryFile = new Set(Object.values(entries))

/**
 * Says what is wrong with one import of a file of a part, or nothing where it is free. `target` is the file of ours
 * that the import names, by its path from the root, where it names one.
 */
function wrong(part, inTests, target) {
  if (target.startsWith(`parts/${part}/`)) return undefined
  if (target.startsWith('rig/')) return inTests ? undefined : 'a file of rig/ is imported by a test of a part alone'
  const other = /^parts\/([^/]+)\//.exec(target)?.[1]
  if (!other) return 'it is no file of a part'
  const row = mayUse.get(part)
  if (row && !row.includes(other) && !(inTests && other === 'test')) return `${other} is no part that ${part} may use`
  if (!entryFile.has(target)) return `it is no entry file of ${other}`
  return undefined
}

// The room runtime, which a host loads alone into an isolate: its own files of the seam import single files of
// `data`, never its entry, and the rig of the room runtime holds that graph. `core` they take by its entries, and a
// file of any other part that the room runtime reaches is held as every file is.
const roomRuntime = 'parts/engine/rooms/inside/'
const seam = 'parts/engine/rooms/'

// A large test of a part lies under `tests/apps/<part>/` or `tests/browsers/<part>/`, and is held as a test of that
// part. The other files of `tests/` belong to no part, and are held to nothing.
const largeTest = /^tests\/(?:apps|browsers)\/([^/]+)\/./
/** The part a held file is held as, and the folder of that part it is held as lying in. */
function placeOf(file) {
  const large = largeTest.exec(file)
  if (large) return { part: large[1], kind: 'tests' }
  const [, part, kind] = file.split('/')
  return { part, kind }
}

const files = heldFiles(folder).filter(
  (file) => (file.startsWith('parts/') && file.split('/').length > 2) || largeTest.test(file),
)
const read = new Map()
for (const file of files) {
  const { text, imports, errors } = importsIn(folder, file)
  for (const error of errors) found.push(`${file}:1  the reader of source cannot read the file: ${error.message}`)
  read.set(file, { text, imports })
}

/** Every file that the room runtime reaches, by every import of ours it makes and every import of those. */
function reachedByRoomRuntime() {
  const reached = new Set()
  const next = files.filter((file) => file.startsWith(roomRuntime))
  for (let file = next.pop(); file !== undefined; file = next.pop()) {
    if (reached.has(file) || !read.has(file)) continue
    reached.add(file)
    for (const { name } of read.get(file).imports) if (name.startsWith('.')) next.push(resolvedFrom(file, name))
  }
  return reached
}
const ofRoomRuntime = reachedByRoomRuntime()

for (const file of files) {
  const { part, kind } = placeOf(file)
  const inTests = kind === 'tests'
  if (!mayUse.has(part)) {
    found.push(`${file}:1  ${part} is no part of the table`)
    continue
  }
  const { text, imports } = read.get(file)
  for (const { name, place } of imports) {
    // The runtime's own modules are free.
    if (name.startsWith('node:')) continue
    const ours = name.startsWith('.') || name === 'forjr' || name.startsWith('forjr/')
    let words
    if (!ours) {
      if (kind !== 'borrowed') words = `a package that is not ours is imported by a wrapper alone`
    } else if (name.startsWith('.')) {
      const target = resolvedFrom(file, name)
      words = wrong(part, inTests, target)
      if (words === 'it is no entry file of data' && file.startsWith(seam) && ofRoomRuntime.has(file)) words = undefined
    } else if (!entries[name]) words = 'parts/entries.json holds no entry file under that import'
    else words = wrong(part, inTests, entries[name])
    if (words) found.push(`${file}:${text.slice(0, place).split('\n').length}  imports '${name}': ${words}`)
  }
}

// A script of the repository takes from the parts the rule of tokens and the weighing, which its map shares with the
// map of an app, and the count of programs at once, which the test runner shares with `forjr test`: nothing else.
const shared = ['parts/core/tokens.ts', 'parts/core/map/weigh.ts', 'parts/cli/programsAtOnce.ts']
for (const file of heldFiles(folder).filter((one) => one.startsWith('scripts/'))) {
  const { text, imports } = importsIn(folder, file)
  for (const { name, place } of imports) {
    const target = name.startsWith('.') ? resolvedFrom(file, name) : ''
    if (target.startsWith('parts/') && !shared.includes(target))
      found.push(
        `${file}:${text.slice(0, place).split('\n').length}  imports '${name}': a script takes from the parts ${shared.join(', ')} alone`,
      )
  }
}

if (found.length) {
  console.log(`${found.join('\n')}\n\n${found.length} found in ${files.length} files.`)
  process.exit(1)
}
console.log(`${files.length} files. Nothing found.`)
