import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { copyOf, root, start } from './plant.ts'

const program = 'scripts/review/committed.mjs'

// Each form of a secret, made here so that the text of this test holds none of them.
const keys: [string, string][] = [
  ['a private key block', `-----BEGIN RSA ${'PRIVATE'} KEY-----`],
  ['a key of AWS', `${'AK'}IA${'A1B2C3D4E5F6G7H8'}`],
  ['a token of GitHub', `${'gh'}p_${'a'.repeat(36)}`],
  ['a token of Slack', `${'xo'}xb-${'1'.repeat(12)}`],
  ['a live key of Stripe', `${'sk'}_live_${'b'.repeat(24)}`],
  ['a key of Anthropic', `${'sk'}-ant-${'c'.repeat(24)}`],
  ['a key of OpenAI', `${'sk'}-proj-${'d'.repeat(24)}`],
  ['a key of Google', `${'AI'}za${'e'.repeat(35)}`],
]

/** A copy of the planted tree under git, its files on `main`, and a branch of a change. */
function branched(t: TestContext): { folder: string; git: (...words: string[]) => string } {
  const folder = copyOf(t, 'committed')
  const git = (...words: string[]) => execFileSync('git', words, { cwd: folder, encoding: 'utf8' })
  git('init', '--quiet', '--initial-branch=main')
  git('add', '.')
  git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '--quiet', '-m', 'main')
  git('checkout', '--quiet', '-b', 'change')
  return { folder, git }
}

test('[55-11] the rule of what is committed finds a secret of each known form in what a change adds or changes, and in what git does not track yet, and a path that .gitignore names', (t) => {
  const { folder, git } = branched(t)
  writeFileSync(join(folder, 'parts', 'core', 'keys.ts'), `${keys.map(([, key]) => `// ${key}`).join('\n')}\n`)
  git('add', 'parts/core/keys.ts')
  writeFileSync(join(folder, 'parts', 'core', 'loose.ts'), `// ${keys[1][1]}\n`)
  writeFileSync(join(folder, 'local.env'), 'NAME=value\n')
  git('add', '--force', 'local.env')
  const ended = start(root, program, folder)
  assert.equal(ended.code, 1, ended.out)
  for (const [at, [words]] of keys.entries())
    assert.match(ended.out, new RegExp(`^parts/core/keys\\.ts:${at + 1} {2}holds ${words}$`, 'm'))
  assert.match(ended.out, /^parts\/core\/loose\.ts:1 {2}holds a key of AWS$/m)
  assert.match(ended.out, /^local\.env {2}is a path that \.gitignore names$/m)

  // Without them the change passes.
  git('rm', '--quiet', '--cached', 'parts/core/keys.ts', 'local.env')
  for (const file of ['parts/core/keys.ts', 'parts/core/loose.ts', 'local.env']) rmSync(join(folder, file))
  const passed = start(root, program, folder)
  assert.equal(passed.code, 0, passed.out)
  assert.match(passed.out, /Nothing found\./)
})

test('[55-11] the rule of what is committed holds a change of more files than a command line of Windows can name', (t) => {
  const { folder } = branched(t)
  const many = join(folder, 'parts', 'core', 'many')
  mkdirSync(many, { recursive: true })
  // 1,500 paths of some 70 letters each pass the 32,767 letters of a command line of Windows.
  for (let n = 0; n < 1500; n++)
    writeFileSync(join(many, `a-file-whose-name-is-long-enough-to-count-${String(n).padStart(4, '0')}.ts`), '// one\n')
  const ended = start(root, program, folder)
  assert.equal(ended.code, 0, ended.out)
  assert.match(ended.out, /^1500 files\. Nothing found\.$/m)
})
