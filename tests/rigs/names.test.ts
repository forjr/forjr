import assert from 'node:assert/strict'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copyOf, planted, root, start } from './plant.ts'

const program = 'scripts/names.mjs'
const names = (folder: string) => start(root, program, folder)

test('[03-32] a name that two files of one part give fails the rig of the names and is named with both files; the one name of the form of a list folder, its made list, a name given again from another file and one a file keeps to itself pass', (t) => {
  const both = names(planted('names'))
  assert.equal(both.code, 1, both.out)
  assert.match(both.out, /^core {2}same is given by 2 files: parts\/core\/one\.ts, parts\/core\/two\.ts$/m)
  assert.match(both.out, /^1 found in \d+ files\.$/m)
  assert.doesNotMatch(both.out, /\b(?:rule|handle|list|first|third)\b is given/)

  const alone = copyOf(t, 'names')
  rmSync(join(alone, 'parts', 'core', 'two.ts'))
  const passed = names(alone)
  assert.equal(passed.code, 0, passed.out)
  assert.match(passed.out, /Nothing found\./)
})

test('[03-32] a name that two helpers beside the tests of one part give fails the rig of the names and is named with both files; a name that a helper gives beside the code of its part, a test file and a folder inside the tests pass', (t) => {
  const both = names(planted('namesHelpers'))
  assert.equal(both.code, 1, both.out)
  assert.match(
    both.out,
    /^core {2}same is given by 2 files: parts\/core\/tests\/one\.ts, parts\/core\/tests\/two\.ts$/m,
  )
  assert.match(both.out, /^1 found in \d+ files\.$/m)

  const alone = copyOf(t, 'namesHelpers')
  rmSync(join(alone, 'parts', 'core', 'tests', 'two.ts'))
  const passed = names(alone)
  assert.equal(passed.code, 0, passed.out)
  assert.match(passed.out, /Nothing found\./)
})

test('[03-32] a name that a file gives under another name than it imported, with no `from`, is given by that file: the rig of the names fails where another file of the part gives it too', (t) => {
  const folder = copyOf(t, 'names')
  rmSync(join(folder, 'parts', 'core', 'two.ts'))
  writeFileSync(
    join(folder, 'parts', 'core', 'renamed.ts'),
    "import { first } from './one.ts'\n\nexport { first as same }\n",
  )
  const ran = names(folder)
  assert.equal(ran.code, 1, ran.out)
  assert.match(ran.out, /^core {2}same is given by 2 files: parts\/core\/one\.ts, parts\/core\/renamed\.ts$/m)
})

test('[03-32] a name that a file gives under another name than it imported, as an entry file gives `scanned as scan`, is given by that file: the rig of the names fails where another file of the part gives it too', (t) => {
  const folder = copyOf(t, 'names')
  rmSync(join(folder, 'parts', 'core', 'two.ts'))
  // `one.ts` gives `same`; this file gives a second thing under that name, as `parts/build/index.ts` gives `scan`.
  writeFileSync(join(folder, 'parts', 'core', 'renamed.ts'), "export { first as same } from './one.ts'\n")
  const ran = start(root, 'scripts/names.mjs', folder)
  assert.equal(ran.code, 1, ran.out)
  assert.match(ran.out, /^core {2}same is given by 2 files: parts\/core\/one\.ts, parts\/core\/renamed\.ts$/m)
})
