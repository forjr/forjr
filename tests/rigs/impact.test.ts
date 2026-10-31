import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { copyOf, start } from './plant.ts'

const program = 'scripts/impact.mjs'

/** A copy of the planted tree under git: its files on `main`, then a branch that changes one and adds another. */
function changedTree(t: TestContext): string {
  const folder = copyOf(t, 'ownMap')
  writeFileSync(join(folder, '.gitignore'), 'results/\n')
  const git = (...words: string[]) => execFileSync('git', words, { cwd: folder, encoding: 'utf8' })
  git('init', '--quiet', '--initial-branch=main')
  git('add', '.')
  git('-c', 'user.name=test', '-c', 'user.email=test@example.com', 'commit', '--quiet', '-m', 'main')
  git('checkout', '--quiet', '-b', 'change')
  writeFileSync(
    join(folder, 'parts', 'core', 'inner.ts'),
    '/** A number that the entry hands on. */\nexport const inner = (): number => 2\n',
  )
  writeFileSync(join(folder, 'parts', 'data', 'more.ts'), '/** One more. */\nexport const more = (): number => 3\n')
  return folder
}

test('[55-11] npm run impact names the files a change touched, the files that import them however deep, their parts and the test files whose record names a changed file', (t) => {
  const folder = changedTree(t)
  const none = JSON.parse(start(folder, program, '--json').out)
  assert.deepEqual(none, {
    changed: ['parts/core/inner.ts', 'parts/data/more.ts'],
    reached: ['parts/core/index.ts', 'parts/data/index.ts', 'parts/data/rows.ts', 'parts/data/tests/rows.test.ts'],
    parts: ['core', 'data'],
    tests: [],
    runs: false,
  })
  assert.match(start(folder, program).out, /^no record of the runs: run npm test$/m)

  mkdirSync(join(folder, 'results', 'kept'), { recursive: true })
  writeFileSync(
    join(folder, 'results', 'kept', 'all.json'),
    JSON.stringify({
      'parts/data/tests/rows.test.ts': { touched: ['parts/core/inner.ts'] },
      'parts/data/tests/other.test.ts': { touched: ['parts/data/index.ts'] },
    }),
  )
  const told = JSON.parse(start(folder, program, '--json').out)
  assert.deepEqual(told.tests, ['parts/data/tests/rows.test.ts'])
  assert.equal(told.runs, true)
  const text = start(folder, program).out
  assert.match(text, /^changed\n {2}parts\/core\/inner\.ts\n {2}parts\/data\/more\.ts\nreached\n/)
  assert.match(text, /^tests\n {2}parts\/data\/tests\/rows\.test\.ts$/m)
})
