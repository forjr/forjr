import assert from 'node:assert/strict'
import { cpSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copyOf, root, start } from './plant.ts'

const program = 'scripts/check.mjs'

test('[55-11] npm run check runs every check the tree holds, answers what they found as one list by file and line, and names each program the tree does not hold as not run', (t) => {
  const folder = copyOf(t, 'ownMap')
  // One rule of review that the tree holds, with a dash of its own to find, and a file laid out as no formatter would.
  mkdirSync(join(folder, 'scripts', 'review'), { recursive: true })
  cpSync(join(root, 'scripts', 'review', 'dashes.mjs'), join(folder, 'scripts', 'review', 'dashes.mjs'))
  writeFileSync(
    join(folder, 'parts', 'data', 'told.ts'),
    `/** A word. */\nexport const told = 'a ${String.fromCharCode(0x2013)} b'\n`,
  )
  writeFileSync(join(folder, 'parts', 'core', 'loose.ts'), '/** A number. */\nexport const loose   =   1;\n')

  const ended = start(folder, program)
  assert.equal(ended.code, 1, ended.out)
  const lines = ended.out.trimEnd().split('\n')
  assert.ok(
    lines.includes('parts/data/told.ts:2  scripts/review/dashes.mjs  holds a dash that is no plain hyphen'),
    ended.out,
  )
  assert.ok(
    lines.some((line) => /^parts\/core\/loose\.ts(?::\d+)? {2}biome format {2}/.test(line)),
    ended.out,
  )
  assert.match(ended.out, /^\d+ found$/m)
  const notRun = lines.at(-1) ?? ''
  for (const one of ['scripts/lists.mjs', 'docs/check.mjs', 'scripts/oldName.mjs', 'scripts/imports.mjs'])
    assert.ok(notRun.includes(one), notRun)

  const json = JSON.parse(start(folder, program, '--json').out)
  assert.ok(
    json.findings.some(
      (one: { check: string; file?: string; line?: number }) =>
        one.check === 'scripts/review/dashes.mjs' && one.file === 'parts/data/told.ts' && one.line === 2,
    ),
    JSON.stringify(json),
  )
  assert.ok(json.notRun.includes('docs/check.mjs'))
  // The findings stand in the order of their files and lines.
  const places = json.findings.map((one: { file?: string; line?: number }) => `${one.file ?? ''}:${one.line ?? 0}`)
  assert.deepEqual(
    places,
    [...places].sort((a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })),
  )
})
