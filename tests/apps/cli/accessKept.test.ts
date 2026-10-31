import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copied, typed } from '../../../parts/cli/tests/typed.ts'

const expected = join(import.meta.dirname, '..', '..', '..', 'parts', 'cli', 'tests', 'expected')

test('[55-12] forjr access on a fixed project prints the same text and the same --json as before the map', async (t) => {
  const project = copied(t, 'access-kept', 'accessShop')
  const printed = await typed(project, 'access')
  assert.equal(printed.ended, 0, printed.printed)
  assert.equal(`${printed.printed}\n`, readFileSync(join(expected, 'access.txt'), 'utf8'))
  const asJson = await typed(project, 'access', '--json')
  assert.equal(asJson.ended, 0, asJson.printed)
  assert.deepEqual(JSON.parse(asJson.printed), JSON.parse(readFileSync(join(expected, 'access.json'), 'utf8')))
})
