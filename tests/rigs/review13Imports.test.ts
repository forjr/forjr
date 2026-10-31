import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copyOf, root, start } from './plant.ts'

// The planted files of the project of the imports that the rig finds, left out of the copy so that it holds none.
const cases = ['parts/data/reaches.ts', 'parts/data/inside.ts', 'parts/data/package.ts', 'parts/data/rigged.ts']

test('[55-11] a script under scripts/ imports parts/core/tokens.ts, parts/core/map/weigh.ts and parts/cli/programsAtOnce.ts alone, and nothing else of parts/', (t) => {
  const folder = copyOf(t, 'imports', cases)
  const entries = join(folder, 'parts', 'entries.json')
  const lines: [string, string][] = Object.entries(JSON.parse(readFileSync(entries, 'utf8')))
  writeFileSync(entries, JSON.stringify(Object.fromEntries(lines.sort(([a], [b]) => (a < b ? -1 : 1))), null, 2))
  mkdirSync(join(folder, 'scripts'))
  writeFileSync(
    join(folder, 'scripts', 'shared.mjs'),
    "import { tokenCount } from '../parts/core/tokens.ts'\nimport { weighed } from '../parts/core/map/weigh.ts'\nimport { coresHere } from '../parts/cli/programsAtOnce.ts'\n\nexport const shared = [tokenCount, weighed, coresHere]\n",
  )
  const free = start(root, 'scripts/imports.mjs', folder)
  assert.equal(free.code, 0, free.out)

  writeFileSync(
    join(folder, 'scripts', 'wide.mjs'),
    "import { engine } from '../parts/engine/index.ts'\nimport { cli } from '../parts/cli/index.ts'\nimport { inner } from '../parts/core/inner.ts'\n\nexport const wide = [engine, cli, inner]\n",
  )
  const refused = start(root, 'scripts/imports.mjs', folder)
  assert.equal(refused.code, 1, refused.out)
  for (const line of [1, 2, 3])
    assert.match(refused.out, new RegExp(`^scripts/wide\\.mjs:${line} {2}imports '`, 'm'), refused.out)
  assert.doesNotMatch(refused.out, /^scripts\/shared\.mjs/m, refused.out)
})
