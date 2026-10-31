// Holds that a name a file gives to another file stands once in its part: no two files of a part give one name.
// Run: node scripts/names.mjs [folder]      Ends with 1 when it finds something.
import { readFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSync } from 'oxc-parser'
import { heldFiles } from './held.mjs'
import { folders, pages } from './listFolders.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const folder = process.argv[2] ?? root

/**
 * The names that a file gives: each export that it declares or names itself, and each that it gives under another
 * name than it took, and none that it gives again from another file under the name it had there.
 */
function givenBy(program) {
  // A name that the file imports and exports again under that name is given by the file it came from.
  const imported = new Set(
    program.body.flatMap((node) =>
      node.type === 'ImportDeclaration' ? node.specifiers.map((one) => one.local.name) : [],
    ),
  )
  const names = []
  for (const node of program.body) {
    if (node.type !== 'ExportNamedDeclaration') continue
    const declared = node.declaration
    if (!declared) {
      for (const one of node.specifiers) {
        const local = one.local.name ?? one.local.value
        const exported = one.exported.name ?? one.exported.value
        if (exported !== local || (!node.source && !imported.has(local))) names.push(exported)
      }
    } else if (declared.type === 'VariableDeclaration') {
      for (const one of declared.declarations) if (one.id.type === 'Identifier') names.push(one.id.name)
    } else if (declared.id?.name) names.push(declared.id.name)
  }
  return [...new Set(names)]
}

// A file of a folder that has a list lies in it, or in a folder inside it, as a rule that is a folder of cases does.
const listFolderOf = (file) =>
  folders.find(
    (place) => place !== pages && file.startsWith(`${place}/`) && file.slice(place.length + 1).split('/').length <= 2,
  )

const found = []
// The test files themselves give nothing to another file. What a part's tests share in a file beside them stands
// once among those helpers, apart from the part's own code, whose names a helper may give again for its tests.
const files = heldFiles(folder).filter((file) => /^parts\/[^/]+\/.+\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file))
const isHelper = (file) => file.split('/')[2] === 'tests'
const read = new Map()
for (const file of files) {
  const { program, errors } = parseSync(file, readFileSync(join(folder, file), 'utf8'))
  for (const error of errors) found.push(`${file}:1  the reader of source cannot read the file: ${error.message}`)
  read.set(file, givenBy(program))
}

// The names of the form of a folder that has a list, read from its files: in a folder of two files or more, a name
// that every file of it gives, as each rule gives `rule` and each handle `handle`. The made `list` counts for none.
const formOf = new Map()
for (const place of folders) {
  if (place === pages) continue
  const own = [...read].filter(([file]) => listFolderOf(file) === place && file !== posix.join(place, 'list.ts'))
  const shared = own.length >= 2 ? own[0][1].filter((name) => own.every(([, names]) => names.includes(name))) : []
  formOf.set(place, new Set(shared))
}

const byPart = new Map()
for (const [file, names] of read) {
  const part = file.split('/')[1]
  const pool = isHelper(file) ? `${part} tests` : part
  const given = byPart.get(pool) ?? new Map()
  byPart.set(pool, given)
  const place = listFolderOf(file)
  for (const name of names) {
    if (place !== undefined && (file === posix.join(place, 'list.ts') ? name === 'list' : formOf.get(place)?.has(name)))
      continue
    given.set(name, [...(given.get(name) ?? []), file])
  }
}
for (const [pool, given] of [...byPart].sort(([a], [b]) => (a < b ? -1 : 1)))
  for (const [name, where] of [...given].sort(([a], [b]) => (a < b ? -1 : 1)))
    if (where.length > 1)
      found.push(`${pool.split(' ')[0]}  ${name} is given by ${where.length} files: ${where.join(', ')}`)

if (found.length) {
  console.log(`${found.join('\n')}\n\n${found.length} found in ${files.length} files.`)
  process.exit(1)
}
console.log(`${files.length} files. Nothing found.`)
