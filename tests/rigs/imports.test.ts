import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { copyOf, planted, root, start } from './plant.ts'

const program = 'scripts/imports.mjs'
// The planted tree is held against the table of the parts it holds, `parts/parts.json`, as the repository is.
const imports = (folder: string) => start(root, program, folder)

// Each planted file, with what the rig says of its import.
const cases = {
  'parts/data/reaches.ts': "parts/data/reaches.ts:1  imports '../engine/index.ts': engine is no part that data may use",
  'parts/data/inside.ts': "parts/data/inside.ts:1  imports '../core/inner.ts': it is no entry file of core",
  'parts/data/package.ts':
    "parts/data/package.ts:1  imports 'borrowed-pack': a package that is not ours is imported by a wrapper alone",
  'parts/data/rigged.ts':
    "parts/data/rigged.ts:1  imports '../../rig/tool.ts': a file of rig/ is imported by a test of a part alone",
}
const files = Object.keys(cases)
const order =
  'parts/entries.json  "forjr/core" stands after "forjr/data", and the lines stand in the order of their names'

/** A copy of the planted tree without each file of `without`, and with the lines of the entry files in their order where `ordered` says so. */
function copyWith(t: TestContext, without: string[], ordered: boolean): string {
  const folder = copyOf(t, 'imports', without)
  const file = join(folder, 'parts', 'entries.json')
  const lines: [string, string][] = Object.entries(JSON.parse(readFileSync(file, 'utf8')))
  if (ordered)
    writeFileSync(file, JSON.stringify(Object.fromEntries(lines.sort(([a], [b]) => (a < b ? -1 : 1))), null, 2))
  return folder
}

test('[03-1] an import of a part that the row does not list, and one of a file that is no entry file, each fail and are named', (t) => {
  const all = imports(planted('imports'))
  assert.equal(all.code, 1, all.out)
  for (const words of [...Object.values(cases), order])
    assert.ok(all.out.includes(words), `${words}\nis not in:\n${all.out}`)
  // Every other import of the tree is free: of its own part, of an entry file, of a wrapper and of a test.
  assert.equal(all.out.match(/ {2}imports '/g)?.length, files.length, all.out)
  assert.match(all.out, /^5 found in 12 files\.$/m)

  for (const [one, words] of Object.entries(cases)) {
    const alone = imports(
      copyWith(
        t,
        files.filter((other) => other !== one),
        true,
      ),
    )
    assert.equal(alone.code, 1, alone.out)
    assert.ok(alone.out.includes(words), alone.out)
    assert.match(alone.out, /^1 found in /m)
  }

  const none = imports(copyWith(t, files, true))
  assert.equal(none.code, 0, none.out)
})

test('[03-1] the lines of the entry files in another order than that of their names fail', (t) => {
  const alone = imports(copyWith(t, files, false))
  assert.equal(alone.code, 1, alone.out)
  assert.ok(alone.out.includes(order), alone.out)
  assert.match(alone.out, /^1 found in /m)
})

test('[03-1] a large test of a part under tests/apps/ or tests/browsers/ reaches inside its own part and inside no other, and a test of the rigs is held to nothing', (t) => {
  const folder = copyWith(t, files, true)
  for (const place of ['tests/apps/data', 'tests/browsers/data', 'tests/rigs'])
    mkdirSync(join(folder, place), { recursive: true })
  writeFileSync(
    join(folder, 'tests', 'apps', 'data', 'own.test.ts'),
    "import { tool } from '../../../rig/tool.ts'\nimport { shared } from '../../../parts/data/tests/shared.ts'\nimport { app } from '../../../parts/test/index.ts'\n\nexport const own = [tool, shared, app]\n",
  )
  writeFileSync(
    join(folder, 'tests', 'rigs', 'free.test.ts'),
    "import { inner } from '../../parts/core/inner.ts'\n\nexport const free = inner\n",
  )
  const free = imports(folder)
  assert.equal(free.code, 0, free.out)

  writeFileSync(
    join(folder, 'tests', 'browsers', 'data', 'elsewhere.test.ts'),
    "import { inner } from '../../../parts/core/inner.ts'\nimport { engine } from '../../../parts/engine/index.ts'\n\nexport const elsewhere = [inner, engine]\n",
  )
  const refused = imports(folder)
  assert.equal(refused.code, 1, refused.out)
  for (const words of [
    "tests/browsers/data/elsewhere.test.ts:1  imports '../../../parts/core/inner.ts': it is no entry file of core",
    "tests/browsers/data/elsewhere.test.ts:2  imports '../../../parts/engine/index.ts': engine is no part that data may use",
  ])
    assert.ok(refused.out.includes(words), `${words}\nis not in:\n${refused.out}`)
  assert.match(refused.out, /^2 found in /m)
})

test('[03-1] a part of parts/parts.json that stands out of the order of the names, and a uses that names no part of the file, each fail and are named', (t) => {
  const folder = copyWith(t, files, true)
  const file = join(folder, 'parts', 'parts.json')
  const table = JSON.parse(readFileSync(file, 'utf8'))
  const { core, ...rest } = table
  writeFileSync(file, JSON.stringify({ ...rest, core, data: { uses: ['core', 'storage'] } }, null, 2))
  const ended = imports(folder)
  assert.equal(ended.code, 1, ended.out)
  assert.ok(
    ended.out.includes('parts/parts.json  "core" stands after "test", and the parts stand in the order of their names'),
    ended.out,
  )
  assert.ok(
    ended.out.includes('parts/parts.json  the uses of data name storage, which is no part of the file'),
    ended.out,
  )
})

test('[55-11] the check of imports and the check of names read no build document', () => {
  for (const script of ['scripts/imports.mjs', 'scripts/names.mjs']) {
    const text = readFileSync(join(root, script), 'utf8')
    assert.doesNotMatch(text, /docs\/build|\d\d-[a-z-]+\.md/, script)
  }
})

test('[03-1] the parts of the repository import what the table of the parts lets them', () => {
  const ended = start(root, program)
  assert.equal(ended.code, 0, ended.out)
})
