import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Description, MapColumn, MapInput, MapOne } from '../internal.ts'
import { mapOf, mapText, mapWord } from '../internal.ts'

const staff = { rule: 'role', role: 'staff' }
const code = (name: string): object => ({ module: `server/${name}.js`, export: name })

/**
 * A small app with an action written as code and a `python`, each of which states the rows it is handed and whose
 * code writes as it likes: what they read by `rows` is known, what their code does is not.
 */
function coded(): Description {
  return Object({
    format: 'forjr.description/2',
    app: { name: 'shop', needsEngine: '1.0' },
    project: {},
    tables: {
      orders: {
        columns: { total: { kind: 'number' }, note: { kind: 'text', optional: true }, status: { kind: 'text' } },
        access: { read: staff },
      },
    },
    functions: {
      ship: {
        kind: 'action',
        form: 'code',
        access: staff,
        rows: { recent: { from: 'orders', pick: ['total'] } },
        ...code('ship'),
      },
      churn: {
        kind: 'action',
        form: 'code',
        access: staff,
        python: { file: 'ml/churn.py' },
        rows: { orders: { from: 'orders', limit: 10 } },
      },
    },
    flows: {},
    screens: {},
    components: {},
    services: {},
    models: {},
    routes: {},
    incoming: {},
    commands: {},
    backfills: {},
    packages: {},
    messages: {},
    assets: {},
    sources: {},
    places: {},
  })
}

// What the build saw in the code of `ship`: it writes `orders`, and sets `orders.status` with a value written in place.
const input = (): MapInput => ({
  description: coded(),
  seen: { ship: { reads: ['orders'], writes: ['orders'], sets: ['orders.status'], calls: [], starts: [], emits: [] } },
})

test('[55-1] an action written as code that states its rows still says what its code was seen to write, on its line and in forjr map <name>', () => {
  const map = mapOf({ ...input(), size: 'all' })
  const line = map.lines.find((one) => one.name === 'ship')
  assert.ok(line, mapText(map))
  // The code wrote `orders.status`, which the build saw: the line names it, marked as seen.
  assert.match(mapText(map), /^action ship {2}.*writes ~orders\.status/m)
  const one: MapOne = Object(mapWord(input(), 'ship'))
  assert.ok(
    one.line.out.some((edge) => edge.kind === 'writes' && edge.name === 'orders' && edge.by === 'seen'),
    JSON.stringify(one.line.out),
  )
  assert.match(mapText(one), /writes ~orders\.status/)
})

test('[55-1] a column that an action written as code or a python may reach by its code is named under may reach it, by code, though each states its rows', () => {
  // `orders.note` is set by neither in a way the build saw, and both are code that may write it.
  const column: MapColumn = Object(mapWord(input(), 'orders.note'))
  const reach = column.mayReach.map((one) => one.name).sort()
  const written = column.writes.map((one) => one.name)
  for (const name of ['churn', 'ship'])
    assert.ok(reach.includes(name) || written.includes(name), `${name} is named nowhere:\n${mapText(column)}`)
})
