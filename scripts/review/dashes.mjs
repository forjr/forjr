// Holds that no file of the code, the tests, the examples and the shipped pages, and no Markdown file at the root,
// holds a dash but the plain hyphen: the en dash and the em dash are refused.
// Run: node scripts/review/dashes.mjs [folder]      Ends with 1 when it finds something.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const folder = process.argv[2] ?? root

// The two dashes, by their codes, so that this text holds neither.
const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`)
// What is never read: installs, what a run or a build wrote, and the planted case of this rule, which holds a dash.
const left = new Set(['node_modules', '.forjr', 'results'])
const planted = 'tests/rigs/projects/dashes'

const files = []
const walk = (path) => {
  if (!existsSync(join(folder, path))) return
  for (const entry of readdirSync(join(folder, path), { withFileTypes: true })) {
    const below = `${path}/${entry.name}`
    if (left.has(entry.name) || below === planted) continue
    if (entry.isDirectory()) walk(below)
    else if (entry.isFile()) files.push(below)
  }
}
for (const top of ['parts', 'rig', 'scripts', 'tests', 'examples', 'install']) walk(top)
for (const entry of readdirSync(folder, { withFileTypes: true }))
  if (entry.isFile() && entry.name.endsWith('.md')) files.push(entry.name)

const found = []
for (const file of files.sort()) {
  const bytes = readFileSync(join(folder, file))
  if (bytes.includes(0)) continue
  for (const [at, line] of bytes.toString('utf8').split('\n').entries())
    if (dashes.test(line)) found.push(`${file}:${at + 1}  holds a dash that is no plain hyphen`)
}

if (found.length) {
  console.log(`${found.join('\n')}\n\n${found.length} found in ${files.length} files.`)
  process.exit(1)
}
console.log(`${files.length} files. Nothing found.`)
