// What a change of the framework touched: the files it changed against the point it left `main`, the files that
// import them however deep, their parts, and the test files whose record names a changed file.
// Run: npm run impact [--json]      The tree is the folder it is started in.
import { execFileSync } from 'node:child_process'
import { importsOf } from './importsOf.mjs'
import { runsRecord } from './runsRecord.mjs'

const tree = process.cwd()
const json = process.argv.includes('--json')
// What git warns of on its error output, as of line endings, is no part of what is answered.
const git = (...words) =>
  execFileSync('git', words, { cwd: tree, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    .split('\n')
    .filter(Boolean)

const [base] = git('merge-base', 'HEAD', 'main')
const changed = [
  ...new Set([...git('diff', '--name-only', base), ...git('ls-files', '--others', '--exclude-standard')]),
].sort()

// The files of the tree that import a changed file, however deep, by the one reading of imports.
const imports = importsOf(tree)
const importedBy = new Map()
for (const [file, targets] of imports)
  for (const target of targets) importedBy.set(target, [...(importedBy.get(target) ?? []), file])
const reached = new Set()
const left = [...changed]
for (let at = left.pop(); at !== undefined; at = left.pop())
  for (const file of importedBy.get(at) ?? [])
    if (!reached.has(file) && !changed.includes(file)) {
      reached.add(file)
      left.push(file)
    }

const parts = [...new Set([...changed, ...reached].flatMap((file) => /^parts\/([^/]+)\//.exec(file)?.[1] ?? []))].sort()
const record = runsRecord(tree)
const tests = record
  ? Object.entries(record)
      .filter(([, held]) => (held.touched ?? []).some((one) => changed.includes(one)))
      .map(([file]) => file)
      .sort()
  : []
const value = { changed, reached: [...reached].sort(), parts, tests, runs: record !== undefined }

if (json) console.log(JSON.stringify(value, null, 2))
else {
  const under = (heading, list) => (list.length ? [heading, ...list.map((one) => `  ${one}`)] : [])
  console.log(
    [
      ...under('changed', value.changed),
      ...under('reached', value.reached),
      ...under('parts', value.parts),
      ...(value.runs ? under('tests', value.tests) : ['no record of the runs: run npm test']),
    ].join('\n'),
  )
}
