import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copyOf, root, start } from './plant.ts'

// The planted files of the tree that each fail the check: the tree is held here without them.
const failing = ['parts/data/reaches.ts', 'parts/data/inside.ts', 'parts/data/package.ts', 'parts/data/rigged.ts']

test('[52-13] the check of imports lets the room runtime import core by its entry and single files of data, and refuses a single file of core, also from a file of data that the room runtime reaches', (t) => {
  const folder = copyOf(t, 'imports', failing)
  const entries = join(folder, 'parts', 'entries.json')
  const lines: [string, string][] = Object.entries(JSON.parse(readFileSync(entries, 'utf8')))
  writeFileSync(entries, JSON.stringify(Object.fromEntries(lines.sort(([a], [b]) => (a < b ? -1 : 1))), null, 2))
  const inside = join(folder, 'parts', 'engine', 'rooms', 'inside')
  mkdirSync(inside, { recursive: true })
  writeFileSync(
    join(inside, 'runtime.ts'),
    "import { inner } from '../../../core/index.ts'\nimport { face } from '../../../data/face.ts'\n\nexport const runtime = [inner, face]\n",
  )
  const check = () => start(root, 'scripts/imports.mjs', folder)
  // A file of data that takes nothing from core by a single file: the room runtime may import it, and core's entry.
  writeFileSync(join(folder, 'parts', 'data', 'face.ts'), 'export const face = 1\n')
  const free = check()
  assert.equal(free.code, 0, free.out)
  // The same file of data, reached by the room runtime, that imports a single file of core: data takes from core by
  // its entry alone, wherever the file is reached from.
  writeFileSync(
    join(folder, 'parts', 'data', 'face.ts'),
    "import { inner } from '../core/inner.ts'\n\nexport const face = inner\n",
  )
  const refused = check()
  assert.equal(refused.code, 1, refused.out)
  assert.ok(
    refused.out.includes("parts/data/face.ts:1  imports '../core/inner.ts': it is no entry file of core"),
    refused.out,
  )
  assert.match(refused.out, /^1 found in /m)
  // The room runtime itself takes core by its entry: a single file of core is refused to it too.
  writeFileSync(join(folder, 'parts', 'data', 'face.ts'), 'export const face = 1\n')
  writeFileSync(
    join(inside, 'runtime.ts'),
    "import { inner } from '../../../core/inner.ts'\nimport { face } from '../../../data/face.ts'\n\nexport const runtime = [inner, face]\n",
  )
  const inner = check()
  assert.equal(inner.code, 1, inner.out)
  assert.ok(
    inner.out.includes(
      "parts/engine/rooms/inside/runtime.ts:1  imports '../../../core/inner.ts': it is no entry file of core",
    ),
    inner.out,
  )
})
