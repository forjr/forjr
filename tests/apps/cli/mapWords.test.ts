import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkValue } from '../../../parts/core/internal.ts'
import { mapShapes } from '../../../parts/cli/tests/mapShapes.ts'
import { copied, typed } from '../../../parts/cli/tests/typed.ts'

const expected = join(import.meta.dirname, '..', '..', '..', 'parts', 'cli', 'tests', 'expected')

// Each word of the project, with the shape of what it answers and the stored text of it.
const words: [string, keyof typeof mapShapes, string][] = [
  ['markPaid', 'one', 'map-markPaid.txt'],
  ['orders.status', 'column', 'map-column.txt'],
  ['functions/orders.ts', 'file', 'map-file.txt'],
  ['functions/money.ts', 'helper', 'map-helper.txt'],
  ['event:paid', 'one', 'map-event.txt'],
]

test('[55-7] forjr map of a name, a column, a file of definitions, a helper and an event answers as each says, as a stored text and as data in its stored shape', async (t) => {
  const project = copied(t, 'map-words', 'mapShop')
  for (const [word, shape, file] of words) {
    const printed = await typed(project, 'map', word)
    assert.equal(printed.ended, 0, `${word}: ${printed.printed}`)
    assert.equal(`${printed.printed}\n`, readFileSync(join(expected, file), 'utf8'), word)
    const asJson = await typed(project, 'map', word, '--json')
    assert.equal(asJson.ended, 0, asJson.printed)
    assert.deepEqual(checkValue(mapShapes[shape], asJson.answer.value), [], word)
  }
})

test('[55-7] a word that names nothing is F0001, with the nearest name in its fix', async (t) => {
  const project = copied(t, 'map-none', 'mapShop')
  const none = await typed(project, 'map', 'ordrs', '--json')
  assert.notEqual(none.ended, 0)
  const [found] = none.answer.findings ?? []
  assert.equal(found?.code, 'F0001')
  assert.match(String(found?.fix), /`orders`/)
})

test('[55-9] forjr map reads what each test touched from .forjr/tests.json of the project', async (t) => {
  const project = copied(t, 'map-tests', 'mapShop')
  mkdirSync(join(project, '.forjr'), { recursive: true })
  const run = (touched: object) => [{ result: 'passed', ms: 1, touched }]
  writeFileSync(
    join(project, '.forjr', 'tests.json'),
    JSON.stringify({
      tests: {
        'tests/orders.test.ts': {
          'the staff mark an order paid': run({ functions: ['markPaid'], wrote: ['orders'] }),
          'a customer lists the open orders': run({ functions: ['openOrders'], read: ['orders', 'customers'] }),
        },
      },
    }),
  )
  const map = await typed(project, 'map', '--json')
  assert.equal(map.ended, 0, map.printed)
  const value = Object(map.answer.value)
  assert.equal(value.tests, true)
  const tests = Object.fromEntries(
    value.lines.map((one: { name: string; tests?: string[] }) => [one.name, one.tests?.length]),
  )
  assert.deepEqual(
    [tests.orders, tests.markPaid, tests.openOrders, tests.addOrder, tests.paid],
    [2, 1, 1, 0, undefined],
  )
  const text = (await typed(project, 'map')).printed
  assert.match(text, /^table orders {2}.* {2}2 tests$/m)
  assert.match(text, /^change addOrder {2}.* {2}no test$/m)
})
