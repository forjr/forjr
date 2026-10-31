import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copyOf, planted, root, start } from './plant.ts'

const program = 'scripts/review/dashes.mjs'

test('[55-11] the rule of dashes finds the en dash and the em dash in a file of the code, of a page and in a Markdown file at the root, and passes on the tree without them', (t) => {
  const found = start(root, program, planted('dashes'))
  assert.equal(found.code, 1, found.out)
  assert.match(found.out, /^parts\/core\/words\.ts:2 {2}holds a dash that is no plain hyphen$/m)
  assert.match(found.out, /^parts\/docs\/pages\/topic\.dashes\.md:3 {2}holds a dash that is no plain hyphen$/m)
  assert.match(found.out, /^README\.md:1 {2}holds a dash that is no plain hyphen$/m)
  assert.match(found.out, /^3 found in \d+ files\.$/m)
  const passed = start(
    root,
    program,
    copyOf(t, 'dashes', ['parts/core/words.ts', 'parts/docs/pages/topic.dashes.md', 'README.md']),
  )
  assert.equal(passed.code, 0, passed.out)
  assert.match(passed.out, /Nothing found\./)
})

test('[55-11] the rule of dashes holds the planted projects of the rigs too, all but its own case', (t) => {
  const folder = copyOf(t, 'dashes', ['parts/core/words.ts', 'parts/docs/pages/topic.dashes.md', 'README.md'])
  const dash = String.fromCharCode(0x2014)
  for (const project of ['other', 'dashes']) {
    mkdirSync(join(folder, 'tests', 'rigs', 'projects', project), { recursive: true })
    writeFileSync(join(folder, 'tests', 'rigs', 'projects', project, 'case.ts'), `// a ${dash} b\n`)
  }
  const found = start(root, program, folder)
  assert.equal(found.code, 1, found.out)
  assert.match(found.out, /^tests\/rigs\/projects\/other\/case\.ts:1 {2}holds a dash that is no plain hyphen$/m)
  assert.match(found.out, /^1 found in \d+ files\.$/m)
})

test('[55-11] no file that the rule of dashes holds in the repository has a dash but the plain hyphen', () => {
  const ended = start(root, program)
  assert.equal(ended.code, 0, ended.out)
})
