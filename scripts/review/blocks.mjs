// Holds that every function a part gives, and every `const` whose value is a function, carries a block of its own:
// a comment written as `/** */` that ends on the line right above its statement.
// Run: node scripts/review/blocks.mjs [folder]      Ends with 1 when it finds something.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseSync } from 'oxc-parser'
import { heldFiles } from '../held.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const folder = process.argv[2] ?? root

const functions = ['ArrowFunctionExpression', 'FunctionExpression']
const files = heldFiles(folder).filter(
  (file) => /^parts\/[^/]+\/.+\.tsx?$/.test(file) && !/^parts\/[^/]+\/(?:tests|borrowed)\//.test(file),
)
const found = []
for (const file of files) {
  const text = readFileSync(join(folder, file), 'utf8')
  const { program, comments } = parseSync(file, text)
  const lineOf = (at) => text.slice(0, at).split('\n').length
  // The line on which each block written as `/** */` ends.
  const blocksEnd = new Set(
    comments.filter((one) => one.type === 'Block' && one.value.startsWith('*')).map((one) => lineOf(one.end)),
  )
  // The names of the overloads just above a statement: the block above the first of them stands for them all.
  let overloads = new Set()
  for (const node of program.body) {
    const declared = node.type === 'ExportNamedDeclaration' ? node.declaration : undefined
    const above = overloads
    overloads = new Set(declared?.type === 'TSDeclareFunction' ? [...above, declared.id?.name] : [])
    if (!declared || (declared.type === 'FunctionDeclaration' && above.has(declared.id?.name))) continue
    if (declared.type === 'TSDeclareFunction' && above.size) continue
    const names =
      declared.type === 'FunctionDeclaration' || declared.type === 'TSDeclareFunction'
        ? [declared.id?.name]
        : declared.type === 'VariableDeclaration'
          ? declared.declarations
              .filter((one) => one.id.type === 'Identifier' && functions.includes(one.init?.type))
              .map((one) => one.id.name)
          : []
    if (!names.length) continue
    const line = lineOf(node.start)
    if (!blocksEnd.has(line - 1))
      for (const name of names) found.push(`${file}:${line}  ${name} carries no block written as /** */ right above it`)
  }
}

if (found.length) {
  console.log(`${found.join('\n')}\n\n${found.length} found in ${files.length} files.`)
  process.exit(1)
}
console.log(`${files.length} files. Nothing found.`)
