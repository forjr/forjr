import assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyOf, planted, result, run } from './plant.ts'

test('[03-21] a test that states the mark and passes fails the run, and the result file holds it as failed', (t) => {
  const withIt = run(planted('markMet'))
  assert.notEqual(withIt.code, 0, withIt.out)
  assert.match(withIt.out, /a test that states the mark passes: \[99-1\] a marked test that is met/)
  assert.deepEqual(result(planted('markMet')).tests, { '99-1': 'failed', '99-2': 'owed', '99-3': 'passed' })

  const folder = copyOf(t, 'markMet', ['tests/met.test.ts'])
  const withoutIt = run(folder)
  assert.equal(withoutIt.code, 0, withoutIt.out)
  assert.deepEqual(result(folder).tests, { '99-2': 'owed', '99-3': 'passed' })
})
