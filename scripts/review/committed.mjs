// Holds that what a change adds or changes against the point it left `main`, and what git does not track yet, holds
// no secret of a known form and no path that `.gitignore` names.
// Run: node scripts/review/committed.mjs [folder]      Ends with 1 when it finds something.
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const folder = process.argv[2] ?? root
// What git warns of on its error output, as of line endings, is no part of what is answered.
const git = (...words) =>
  execFileSync('git', words, { cwd: folder, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    .split('\n')
    .filter(Boolean)

// Each form of a secret, written so that this text matches none of them.
const forms = [
  ['a private key block', new RegExp(`-----BEGIN [A-Z ]*${'PRIVATE'} KEY-----`)],
  ['a key of AWS', new RegExp(`\\b${'AK'}IA[0-9A-Z]{16}\\b`)],
  [
    'a token of GitHub',
    new RegExp(
      `\\b(?:${['ghp', 'gho', 'ghu', 'ghs', 'ghr'].join('|')})_[A-Za-z0-9]{20,}|\\b${'github'}_pat_[A-Za-z0-9_]{20,}`,
    ),
  ],
  ['a token of Slack', new RegExp(`\\bxox[${'abprs'}]-[A-Za-z0-9-]{10,}`)],
  ['a live key of Stripe', new RegExp(`\\b${'sk'}_live_[A-Za-z0-9]{10,}`)],
  ['a key of Anthropic', new RegExp(`\\b${'sk'}-ant-[A-Za-z0-9_-]{10,}`)],
  ['a key of OpenAI', new RegExp(`\\b${'sk'}-proj-[A-Za-z0-9_-]{10,}`)],
  ['a key of Google', new RegExp(`\\b${'AI'}za[0-9A-Za-z_-]{35}\\b`)],
]

const [base] = git('merge-base', 'HEAD', 'main')
const files = [
  ...new Set([
    ...git('diff', '--name-only', '--diff-filter=AM', base),
    ...git('ls-files', '--others', '--exclude-standard'),
  ]),
].sort()
const found = []
for (const file of files) {
  const lies = join(folder, file)
  if (!existsSync(lies) || !statSync(lies).isFile()) continue
  const bytes = readFileSync(lies)
  if (bytes.includes(0)) continue
  for (const [at, line] of bytes.toString('utf8').split('\n').entries())
    for (const [words, form] of forms) if (form.test(line)) found.push(`${file}:${at + 1}  holds ${words}`)
}
// A path that `.gitignore` names, which a change added all the same. The paths are handed on the input: a change of
// some thousand files would pass the length of a command line of Windows.
if (files.length) {
  const ignored = spawnSync('git', ['check-ignore', '--no-index', '--stdin'], {
    cwd: folder,
    encoding: 'utf8',
    input: `${files.join('\n')}\n`,
  })
  for (const file of ignored.stdout.split('\n').filter(Boolean)) found.push(`${file}  is a path that .gitignore names`)
}

if (found.length) {
  console.log(`${found.join('\n')}\n\n${found.length} found in ${files.length} files.`)
  process.exit(1)
}
console.log(`${files.length} files. Nothing found.`)
