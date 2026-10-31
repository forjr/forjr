import assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyOf, planted, root, start } from './plant.ts'

const program = 'scripts/review/blocks.mjs'

test('[55-11] the rule of what a part gives finds each function with no comment written as /** */ right above it, and passes on the tree without them', (t) => {
  const found = start(root, program, planted('blocks'))
  assert.equal(found.code, 1, found.out)
  assert.match(found.out, /^parts\/core\/bare\.ts:2 {2}bare carries no block written as \/\*\* \*\/ right above it$/m)
  assert.match(found.out, /^parts\/core\/bare\.ts:8 {2}far carries no block written as \/\*\* \*\/ right above it$/m)
  assert.match(found.out, /^2 found in \d+ files\.$/m)
  // A block above a function and above the overloads, a value that is no function, a function the file keeps, and the
  // files of the tests and of a wrapper pass.
  const passed = start(root, program, copyOf(t, 'blocks', ['parts/core/bare.ts']))
  assert.equal(passed.code, 0, passed.out)
  assert.match(passed.out, /Nothing found\./)
})

test('[55-11] every function a part of the repository gives says what it does right above it', () => {
  const ended = start(root, program)
  assert.equal(ended.code, 0, ended.out)
})
