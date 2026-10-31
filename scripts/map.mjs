// The framework's own map: each part, and each file of the parts by its weight, with what it imports, what imports
// it and the test files that touched it, cut to a size in tokens.
// Run: npm run map [<part> | <file>] [--size <tokens>] [--all] [--json]      The tree is the folder it is started in;
// ends with 1 for a word that names no part and no file.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSync } from 'oxc-parser'
import { weighed } from '../parts/core/map/weigh.ts'
import { tokenCount } from '../parts/core/tokens.ts'
import { importsOf } from './importsOf.mjs'
import { runsRecord } from './runsRecord.mjs'

const tree = process.cwd()
const words = process.argv.slice(2)
const json = words.includes('--json')
const all = words.includes('--all')
const sizeAt = words.indexOf('--size')
const size = all ? Number.POSITIVE_INFINITY : sizeAt >= 0 ? Number(words[sizeAt + 1]) : 1500
const word = words.find((one, at) => !one.startsWith('--') && words[at - 1] !== '--size')

const read = (file) => JSON.parse(readFileSync(join(tree, file), 'utf8'))
const partsOf = existsSync(join(tree, 'parts', 'parts.json')) ? read('parts/parts.json') : {}
const entries = existsSync(join(tree, 'parts', 'entries.json')) ? Object.values(read('parts/entries.json')) : []

// The files of the parts, outside each part's tests, each with the files of the parts it imports.
const imports = new Map([...importsOf(tree)].filter(([file]) => /^parts\/[^/]+\/(?!tests\/)/.test(file)))
const files = [...imports.keys()].sort()
const importedBy = new Map(files.map((file) => [file, []]))
for (const [file, targets] of imports) for (const target of targets) importedBy.get(target)?.push(file)
const order = weighed({
  nodes: files,
  edges: [...imports].flatMap(([file, targets]) => targets.filter((one) => imports.has(one)).map((one) => [file, one])),
  doors: entries.filter((one) => imports.has(one)),
})
const rank = new Map(order.map((one, at) => [one.name, at]))
const byWeight = (list) => [...list].sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0))
const record = runsRecord(tree)
const touchedBy = (file) =>
  Object.entries(record ?? {})
    .filter(([, held]) => (held.touched ?? []).includes(file))
    .map(([test]) => test)
    .sort()

/** The first line of a block written as `/** *\/`, without its marks. */
const firstLine = (block) =>
  block
    .split('\n')
    .map((line) => line.replace(/^\s*\*?\s?/, '').trim())
    .find((line) => line !== '' && line !== '*') ?? ''

/** What a file exports, each name with the first line of the block above its statement, in the order of the file. */
function exportsOf(file) {
  const text = readFileSync(join(tree, file), 'utf8')
  const { program, comments } = parseSync(file, text)
  const blockAbove = (start) => {
    const block = comments.findLast((one) => one.type === 'Block' && one.end <= start && one.value.startsWith('*'))
    return block && text.slice(block.end, start).trim() === '' ? firstLine(block.value.slice(1)) : ''
  }
  return program.body.flatMap((node) => {
    if (node.type !== 'ExportNamedDeclaration' || !node.declaration) return []
    const declared = node.declaration
    const names =
      declared.type === 'VariableDeclaration'
        ? declared.declarations.flatMap((one) => (one.id.type === 'Identifier' ? [one.id.name] : []))
        : declared.id?.name
          ? [declared.id.name]
          : []
    return names.map((name) => ({ name, about: blockAbove(node.start) }))
  })
}

/** A group of names, at most four where it is cut, then how many more. */
const group = (list, whole) =>
  whole || list.length <= 4 ? list.join(', ') : `${list.slice(0, 4).join(', ')} and ${list.length - 4} more`

/** One file as data. */
const fileOf = (path) => ({
  path,
  about: exportsOf(path)[0]?.about ?? '',
  imports: byWeight((imports.get(path) ?? []).filter((one) => imports.has(one))),
  importedBy: byWeight(importedBy.get(path) ?? []),
  touchedBy: touchedBy(path),
  weight: order.find((one) => one.name === path)?.weight ?? 0,
})

/** The line of a file: its path, what it is about, what it imports and what imports it, and the tests that touched it. */
const fileLine = (one, whole) =>
  [
    one.path,
    one.about,
    one.imports.length ? `imports ${group(one.imports, whole)}` : '',
    one.importedBy.length ? `imported by ${group(one.importedBy, whole)}` : '',
    record ? `touched by ${one.touchedBy.length} test file${one.touchedBy.length === 1 ? '' : 's'}` : '',
  ]
    .filter((field) => field !== '')
    .join('  ')

const parts = Object.keys(partsOf)
  .sort()
  .map((name) => ({
    name,
    uses: partsOf[name].uses,
    entries: entries.filter((one) => one.startsWith(`parts/${name}/`)).sort(),
    files: files.filter((one) => one.startsWith(`parts/${name}/`)).length,
  }))
const partLine = (one) =>
  [
    `part ${one.name}`,
    `uses ${Array.isArray(one.uses) ? one.uses.join(', ') || 'nothing' : one.uses}`,
    one.entries.length ? `entries ${one.entries.join(', ')}` : '',
    `${one.files} files`,
  ]
    .filter((field) => field !== '')
    .join('  ')

/** How many letters must change to turn one word into another. */
function lettersApart(a, b) {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const next = [i]
    for (let j = 1; j <= b.length; j++)
      next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    row = next
  }
  return row[b.length]
}

const first = `forjr repository: ${parts.length} parts, ${files.length} files${record ? '' : '  no record of the runs: run npm test'}`
let shownParts = parts
let shownFiles
let more = 0
let lines
if (word === undefined) {
  lines = [first, ...parts.map(partLine)]
  shownFiles = []
  for (const { name } of order) {
    const one = fileOf(name)
    const line = fileLine(one, false)
    if (tokenCount([...lines, line].join('\n')) > size) break
    lines.push(line)
    shownFiles.push(one)
  }
  more = files.length - shownFiles.length
  if (more) lines.push(`${more} more: npm run map --all, or npm run map <file>`)
} else if (partsOf[word] !== undefined) {
  shownParts = parts.filter((one) => one.name === word)
  shownFiles = order
    .map((one) => one.name)
    .filter((one) => one.startsWith(`parts/${word}/`))
    .map(fileOf)
  lines = [partLine(shownParts[0]), ...shownFiles.map((one) => fileLine(one, false))]
} else if (imports.has(word)) {
  shownParts = []
  shownFiles = [fileOf(word)]
  lines = [
    fileLine(shownFiles[0], true),
    ...exportsOf(word).map((one) => `  ${one.name}${one.about ? `  ${one.about}` : ''}`),
    ...(shownFiles[0].touchedBy.length ? ['touched by', ...shownFiles[0].touchedBy.map((one) => `  ${one}`)] : []),
  ]
} else {
  const near = [...parts.map((one) => one.name), ...files].sort(
    (a, b) => lettersApart(word, a) - lettersApart(word, b) || (a < b ? -1 : 1),
  )[0]
  console.log(`No part and no file is named ${word}. The nearest is ${near}.`)
  process.exit(1)
}

if (json)
  console.log(JSON.stringify({ parts: shownParts, files: shownFiles, more, runs: record !== undefined }, null, 2))
else console.log(lines.join('\n'))
