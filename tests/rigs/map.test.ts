import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { copyOf, start } from './plant.ts'

const program = 'scripts/map.mjs'

/** A copy of the planted tree, with a record of the runs where `kept` says so. */
function laid(t: TestContext, kept: boolean): string {
  const folder = copyOf(t, 'ownMap')
  if (kept) {
    mkdirSync(join(folder, 'results', 'kept'), { recursive: true })
    writeFileSync(
      join(folder, 'results', 'kept', 'all.json'),
      JSON.stringify({ 'parts/data/tests/rows.test.ts': { touched: ['parts/data/rows.ts', 'parts/core/index.ts'] } }),
    )
  }
  return folder
}

test('[55-11] npm run map says each part and each file of the parts by its weight, with what it imports, what imports it and the test files that touched it', (t) => {
  const folder = laid(t, true)
  const ended = start(folder, program)
  assert.equal(ended.code, 0, ended.out)
  const lines = ended.out.trimEnd().split('\n')
  assert.equal(lines[0], 'forjr repository: 2 parts, 4 files')
  assert.equal(lines[1], 'part core  uses nothing  entries parts/core/index.ts  2 files')
  assert.equal(lines[2], 'part data  uses core  entries parts/data/index.ts  2 files')
  assert.ok(
    lines.includes(
      'parts/core/index.ts  The entry of the core of a planted tree.  imports parts/core/inner.ts  imported by parts/data/index.ts, parts/data/rows.ts  touched by 1 test file',
    ),
    ended.out,
  )
  assert.ok(
    lines.includes(
      'parts/data/rows.ts  The rows of the data, counted.  imports parts/core/index.ts  touched by 1 test file',
    ),
  )
  // A file of the tests of a part is no file of the map.
  assert.doesNotMatch(ended.out, /rows\.test\.ts {2}/)

  const json = JSON.parse(start(folder, program, '--json').out)
  assert.deepEqual(json.parts, [
    { name: 'core', uses: [], entries: ['parts/core/index.ts'], files: 2 },
    { name: 'data', uses: ['core'], entries: ['parts/data/index.ts'], files: 2 },
  ])
  assert.equal(json.runs, true)
  assert.equal(json.more, 0)
  const weights = json.files.map((one: { weight: number }) => one.weight)
  assert.deepEqual(
    weights,
    [...weights].sort((a: number, b: number) => b - a),
  )
  const index = json.files.find((one: { path: string }) => one.path === 'parts/core/index.ts')
  assert.deepEqual(index.touchedBy, ['parts/data/tests/rows.test.ts'])
  assert.deepEqual(index.imports, ['parts/core/inner.ts'])
})

test('[55-11] npm run map is cut to its size, gives one part or one file whole, says where no record of the runs is, and names the nearest of a word that is none', (t) => {
  const folder = laid(t, false)
  const all = start(folder, program)
  assert.equal(all.out.split('\n')[0], 'forjr repository: 2 parts, 4 files  no record of the runs: run npm test')
  assert.doesNotMatch(all.out, /touched by/)
  const cut = start(folder, program, '--size', '60')
  assert.match(cut.out, /^\d+ more: npm run map --all, or npm run map <file>$/m)
  assert.doesNotMatch(start(folder, program, '--size', '60', '--all').out, /more: npm run map/)

  const part = start(folder, program, 'data').out.trimEnd().split('\n')
  assert.equal(part[0], 'part data  uses core  entries parts/data/index.ts  2 files')
  assert.deepEqual(
    part
      .slice(1)
      .map((line) => line.split('  ')[0])
      .sort(),
    ['parts/data/index.ts', 'parts/data/rows.ts'],
  )

  const kept = laid(t, true)
  const file = start(kept, program, 'parts/core/index.ts').out.trimEnd().split('\n')
  assert.deepEqual(file, [
    'parts/core/index.ts  The entry of the core of a planted tree.  imports parts/core/inner.ts  imported by parts/data/index.ts, parts/data/rows.ts  touched by 1 test file',
    '  core  The entry of the core of a planted tree.',
    'touched by',
    '  parts/data/tests/rows.test.ts',
  ])

  const none = start(folder, program, 'parts/core/innr.ts')
  assert.equal(none.code, 1)
  assert.match(none.out, /The nearest is parts\/core\/inner\.ts\./)
})
