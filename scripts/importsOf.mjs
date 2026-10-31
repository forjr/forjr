// The one reading of the imports of the files of the repository, which the check of imports, the map and the impact
// of the framework read.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { parseSync } from 'oxc-parser'
import { heldFiles } from './held.mjs'

// The kinds of statement and of value that name what they import in a text.
const naming = [
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportAllDeclaration',
  'ImportExpression',
  'TSImportType',
]

/** Walks the tree of a file, and answers each import that names what it imports in a text, with its place. */
function namedIn(node, list = []) {
  if (Array.isArray(node)) for (const one of node) namedIn(one, list)
  else if (node && typeof node === 'object') {
    if (naming.includes(node.type) && node.source?.type === 'Literal' && typeof node.source.value === 'string')
      list.push({ name: node.source.value, place: node.start })
    for (const value of Object.values(node)) namedIn(value, list)
  }
  return list
}

/**
 * Takes the folder of a tree and the path of one of its files. Answers its text, each import it names with its place
 * in the text, and what the reader of source could not read of it.
 */
export function importsIn(folder, file) {
  const text = readFileSync(join(folder, file), 'utf8')
  const { program, errors } = parseSync(file, text)
  return { text, imports: namedIn(program), errors }
}

/** Takes a file of a tree and a path it imports by. Answers the file of the tree that path names, by its path from the root. */
export const resolvedFrom = (file, name) => posix.join(posix.dirname(file), name)

/**
 * Takes the folder of a tree. Answers each file of `parts/`, `scripts/`, `rig/` and `tests/` that the search holds,
 * with the files of the tree it imports by a path that starts with a dot, each list in the order of the paths.
 */
export function importsOf(folder) {
  const found = new Map()
  for (const file of heldFiles(folder).filter((one) => /^(?:parts|scripts|rig|tests)\//.test(one))) {
    const targets = importsIn(folder, file)
      .imports.filter(({ name }) => name.startsWith('.'))
      .map(({ name }) => resolvedFrom(file, name))
      .filter((target) => existsSync(join(folder, target)) && statSync(join(folder, target)).isFile())
    found.set(file, [...new Set(targets)].sort())
  }
  return found
}
