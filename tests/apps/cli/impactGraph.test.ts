import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { copied, typed } from '../../../parts/cli/tests/typed.ts'

interface Reached {
  name: string
  kind: string
  offered?: string[]
  under: Reached[]
}

/** Changes a text in a file of a project, which must stand in it. */
function changed(project: string, file: string, from: string, to: string): void {
  const lies = join(project, file)
  const text = readFileSync(lies, 'utf8')
  assert.ok(text.includes(from), `${file} holds ${from}`)
  writeFileSync(lies, text.replace(from, to))
}

test('[55-5] forjr impact reaches, from a changed table, every definition that uses it on the one graph, each once, counted by kind', async (t) => {
  const project = copied(t, 'impact-graph', 'reachShop')
  assert.equal((await typed(project, 'history', 'save', 'first', '--json')).ended, 0)
  changed(project, 'tables/orders.ts', 'total: number() }', 'total: number(), note: text({ optional: true }) }')
  changed(project, 'commands/report.ts', "about: 'Says the orders'", "about: 'Says every order'")
  changed(project, 'functions/orders.ts', "open: 'the sender signs nothing'", "open: 'nobody signs it'")
  changed(project, 'functions/orders.ts', 'table: orders,', 'table: orders,\n  page: 50,')
  const asked = await typed(project, 'impact', 'first', '--json')
  assert.equal(asked.ended, 0, asked.printed)
  const impact: {
    reaches: { name: string; tree: Reached[] }[]
    untested: string[]
    data: { name: string; reaches?: number }[]
  } = Object(asked.answer.value)

  // The changed column walks from its table, breadth first, each definition under the first that reached it.
  const tree = impact.reaches.find((one) => one.name === 'orders.note')?.tree ?? []
  const walked = (list: Reached[], depth = 0): string[] =>
    list.flatMap((one) => [`${'  '.repeat(depth)}${one.name} ${one.kind}`, ...walked(one.under, depth + 1)])
  assert.deepEqual(walked(tree), [
    'addOrder change',
    '  ordersScreen screen',
    'churn python',
    'openOrders query',
    '  Total component',
    '  helper agent',
    'ship flow',
    '  hook incoming',
    'stamp backfill',
  ])
  const names = walked(tree).map((line) => line.trim().split(' ')[0])
  assert.deepEqual(names, [...new Set(names)])
  assert.deepEqual(tree.find((one) => one.name === 'openOrders')?.offered, ['api'])

  // Counted by kind, the offers apart, in the order of the kinds.
  const printed = (await typed(project, 'impact', 'first')).printed.split('\n')
  assert.ok(
    printed.includes(
      '  orders.note  reaches 3 functions, 2 screens, 1 flow, 1 agent, 1 incoming call, 1 backfill, 1 offered to the API',
    ),
    printed.join('\n'),
  )
  assert.equal(impact.data.find((one) => one.name === 'orders.note')?.reaches, 9)

  // A changed command and a changed incoming call that no test touched are untested; a changed backfill is not.
  assert.ok(impact.untested.includes('report'), JSON.stringify(impact.untested))
  assert.ok(impact.untested.includes('hook'), JSON.stringify(impact.untested))
  assert.equal(impact.untested.includes('stamp'), false)
})

test('[55-5] the impact walks the one graph of core: its own graph is gone', () => {
  const reaches = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'parts', 'publish', 'impact', 'reaches.ts'),
    'utf8',
  )
  // The walk reads the graph of each description, which a file of its own makes once by `usesOf` of core.
  assert.match(reaches, /from '\.\/graph\.ts'/)
  const graph = readFileSync(
    join(import.meta.dirname, '..', '..', '..', 'parts', 'publish', 'impact', 'graph.ts'),
    'utf8',
  )
  assert.match(graph, /\busesOf\b/)
  for (const gone of ['graphOf', 'asked', 'screensOf', 'functionOf'])
    assert.equal(new RegExp(`\\b${gone}\\b`).test(reaches), false, gone)
})
