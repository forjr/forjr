// Runs every check of `npm run all` but the tests and the text of the interfaces, each as the program it is and
// never one that writes, and answers what they found as one list, by file and line.
// Run: npm run check [--json]      Ends with 1 when it finds something. The tree is the folder it is started in.
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const tree = process.cwd()
const own = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = process.argv.includes('--json')

// A borrowed program, found among the packages of the tree, or else of the repository this script lies in.
const borrowed = { biome: 'node_modules/@biomejs/biome/bin/biome', tsc: 'node_modules/typescript/bin/tsc' }
const binOf = (name) => [tree, own].map((one) => join(one, borrowed[name])).find((one) => existsSync(one))

// The programs, in the order of `npm run all`, then the rigs it runs through their tests and the rules of review.
const review = existsSync(join(tree, 'scripts', 'review'))
  ? readdirSync(join(tree, 'scripts', 'review'))
      .filter((one) => one.endsWith('.mjs'))
      .sort()
      .map((one) => `scripts/review/${one}`)
  : []
const programs = [
  { check: 'scripts/lists.mjs', file: 'scripts/lists.mjs', words: ['--main'] },
  { check: 'biome format', bin: 'biome', words: ['format', '--reporter=json'] },
  {
    check: 'biome lint',
    bin: 'biome',
    words: ['lint', '--error-on-warnings', '--diagnostic-level=warn', '--reporter=json'],
  },
  ...['scripts/comments.mjs'].map((file) => ({ check: file, file, words: [] })),
  { check: 'tsc', bin: 'tsc', words: ['--pretty', 'false'] },
  ...[
    'scripts/imports.mjs',
    'scripts/names.mjs',
    'scripts/search.mjs',
    'docs/check.mjs',
    'scripts/oldName.mjs',
    'scripts/pages.mjs',
    'scripts/rules.mjs',
    'scripts/borrowed.mjs',
    ...review,
  ].map((file) => ({ check: file, file, words: [] })),
]

/** What Biome found, read from its JSON: each diagnostic at its file and line. */
function biomeFound(check, out) {
  const start = out.indexOf('{')
  let read
  try {
    read = JSON.parse(out.slice(start))
  } catch {
    return undefined
  }
  return (read.diagnostics ?? []).map((one) => {
    const path = one.location?.path
    const file = String((typeof path === 'string' ? path : path?.file) ?? '').replaceAll('\\', '/')
    // A line counted from 1: the formatter names a whole file, at its line 0.
    const at = Number(one.location?.start?.line ?? 0) || undefined
    return {
      check,
      ...(file ? { file } : {}),
      ...(at ? { line: at } : {}),
      message: `${one.category}: ${one.message ?? one.description}`,
    }
  })
}

/** What a program found, line by line: a line that starts with a path of the tree, with its line where it gives one. */
function linesFound(check, out) {
  const found = []
  for (const line of out.replaceAll('\\', '/').split(/\r?\n/)) {
    const typed = /^(.+?)\((\d+),\d+\): (error TS\d+: .*)$/.exec(line)
    if (check === 'tsc' && typed) {
      found.push({ check, file: typed[1], line: Number(typed[2]), message: typed[3] })
      continue
    }
    const said = /^([^\s:]+?)(?::(\d+)(?::\d+)?)?(?: {2}|: )(.*)$/.exec(line)
    if (said && existsSync(join(tree, said[1])))
      found.push({ check, file: said[1], ...(said[2] ? { line: Number(said[2]) } : {}), message: said[3] })
  }
  return found
}

const found = []
const notRun = []
for (const program of programs) {
  const start = program.bin ? binOf(program.bin) : join(tree, program.file)
  if (!start || !existsSync(start)) {
    notRun.push(program.check)
    continue
  }
  const ended = spawnSync(process.execPath, [start, ...program.words], {
    cwd: tree,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  })
  const out = `${ended.stdout ?? ''}${ended.stderr ?? ''}`
  const read = program.bin === 'biome' ? biomeFound(program.check, ended.stdout ?? '') : linesFound(program.check, out)
  const one = read ?? []
  // A program that failed and named no file and line is one finding with its output.
  if (ended.status !== 0 && !one.length)
    one.push({ check: program.check, message: out.trim() || `ended with ${ended.status}` })
  found.push(...one)
}

const ordered = found.sort(
  (a, b) =>
    (a.file ?? '').localeCompare(b.file ?? '') || (a.line ?? 0) - (b.line ?? 0) || a.check.localeCompare(b.check),
)
if (json) console.log(JSON.stringify({ findings: ordered, notRun }, null, 2))
else {
  const lines = ordered.map(
    (one) => `${one.file ? `${one.file}${one.line ? `:${one.line}` : ''}  ` : ''}${one.check}  ${one.message}`,
  )
  console.log(
    [
      ...lines,
      ordered.length ? `${ordered.length} found` : 'Nothing found.',
      ...(notRun.length ? [`Not run: ${notRun.join(', ')}.`] : []),
    ].join('\n'),
  )
}
process.exit(ordered.length ? 1 : 0)
