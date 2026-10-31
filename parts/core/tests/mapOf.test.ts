import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Description, MapInput } from '../internal.ts'
import { mapOf, mapText, mapWord, tokenCount, weighed } from '../internal.ts'

const text = { kind: 'text' }
const staff = { rule: 'role', role: 'staff' }
const signedIn = { rule: 'signedIn' }
const code = (name: string): object => ({ module: `server/${name}.js`, export: name })
const place = (file: string, from: number, to: number): object => ({ file, from, to })

/** A small app with a definition of most kinds, its places, a hold and a package. */
function mapped(): Description {
  return Object({
    format: 'forjr.description/2',
    app: { name: 'shop', needsEngine: '1.0' },
    project: { hold: { net: ['api.example.com'], programs: ['ffmpeg'], native: ['sharp'] } },
    tables: {
      orders: {
        columns: {
          customer: { kind: 'link', table: 'customers' },
          total: { kind: 'number' },
          note: { kind: 'text', optional: true },
          status: { kind: 'choice', values: ['open', 'paid'], default: 'open' },
          cost: { kind: 'number', read: staff },
        },
        owner: 'placedBy',
        access: { read: { rule: 'owner' }, change: { rule: 'owner' } },
      },
      customers: { columns: { name: text }, access: { read: signedIn } },
      audit: { columns: { line: text } },
    },
    functions: {
      openOrders: {
        kind: 'query',
        form: 'plain',
        access: staff,
        plan: { from: 'orders', with: ['customer'] },
        reads: ['orders', 'customers'],
        offer: ['api'],
      },
      orderCount: {
        kind: 'query',
        form: 'plain',
        access: staff,
        plan: { from: 'orders', count: true },
        reads: ['orders'],
      },
      markPaid: { kind: 'change', form: 'code', access: staff, danger: 'ask', ...code('markPaid') },
      sendNote: { kind: 'action', form: 'code', access: signedIn, sends: false, ...code('sendNote') },
    },
    flows: { tell: { form: 'plain', on: [{ event: 'paid' }, { table: 'orders', when: 'added' }], body: [] } },
    screens: {
      ordersScreen: { path: '/orders', access: staff, data: { orders: { query: 'openOrders' } }, calls: ['markPaid'] },
    },
    components: {},
    services: {},
    models: {},
    routes: {},
    incoming: {},
    commands: {},
    backfills: { stamp: { table: 'audit', run: code('stamp') } },
    packages: {
      'tiny-bars': { by: ['screen:ordersScreen', 'backend:functions/orders.ts'], browser: true, out: ['net'] },
    },
    messages: {},
    assets: {},
    sources: {},
    places: {
      orders: place('tables/orders.ts', 0, 10),
      customers: place('tables/customers.ts', 0, 10),
      audit: place('tables/audit.ts', 0, 10),
      openOrders: place('functions/orders.ts', 0, 10),
      orderCount: place('functions/orders.ts', 20, 30),
      markPaid: place('functions/orders.ts', 40, 50),
      sendNote: place('functions/notes.ts', 0, 10),
      tell: place('flows/tell.ts', 0, 10),
      ordersScreen: place('screens/orders.tsx', 0, 10),
      stamp: place('functions/stamp.ts', 0, 10),
    },
  })
}

const input = (): MapInput => ({
  description: mapped(),
  seen: {
    markPaid: {
      reads: ['orders'],
      writes: ['orders'],
      sets: ['orders.status'],
      calls: [],
      starts: [],
      emits: ['paid'],
    },
    sendNote: nothingSeen(),
    stamp: { ...nothingSeen(), reads: ['audit'], writes: ['audit'] },
  },
  at: {
    orders: { file: 'tables/orders.ts', line: 3, last: 12 },
    openOrders: { file: 'functions/orders.ts', line: 5, last: 9 },
    markPaid: { file: 'functions/orders.ts', line: 20, last: 30 },
  },
  tests: {
    'tests/orders.test.ts: a staff marks it paid': ['markPaid', 'orders', 'openOrders'],
    'tests/orders.test.ts: the list': ['openOrders', 'orders'],
  },
})

function nothingSeen() {
  return { reads: [], writes: [], sets: [], calls: [], starts: [], emits: [] }
}

test('[55-6] weighed gives a door the start of the walk, and a node that more doored nodes lead to weighs more', () => {
  const weights = weighed({
    nodes: ['a', 'b', 'q1', 'q2', 'q3', 'q4', 'lone'],
    edges: [
      ['q1', 'a'],
      ['q2', 'a'],
      ['q3', 'a'],
      ['q4', 'b'],
    ],
    doors: ['q1', 'q2', 'q3', 'q4'],
  })
  const of = Object.fromEntries(weights.map((one) => [one.name, one.weight]))
  assert.equal(weights[0].name, 'a')
  assert.ok(of.a > of.b, JSON.stringify(of))
  assert.equal(of.lone, 0)
  // Every share stays in the walk.
  assert.ok(Math.abs(Object.values(of).reduce((sum, n) => sum + n, 0) - 1) < 1e-9)
  // Nodes of one weight stand in the order they were handed, and with no door every node is one.
  assert.deepEqual(
    weighed({ nodes: ['x', 'y'], edges: [], doors: [] }).map((one) => one.name),
    ['x', 'y'],
  )
})

test('[55-6] the map holds each definition with its file and line, its rule in words, its narrowing, its doors and its edges, the heaviest first', () => {
  const map = mapOf({ ...input(), size: 'all' })
  const lines = mapText(map).split('\n')
  assert.equal(lines[0], 'shop  hold net api.example.com; programs ffmpeg; native sharp  no page bytes')
  assert.equal(lines[1], '~ seen in the code; code: its code may reach more than is named')
  const line = (start: string): string => {
    const found = lines.find((one) => one.startsWith(`${start}  `) || one === start)
    assert.ok(found, `${start}:\n${lines.join('\n')}`)
    return found
  }
  assert.equal(
    line('table orders'),
    'table orders  tables/orders.ts:3  read the owner of the row, change the owner of the row  owner placedBy, cost read role staff  customer (customers), total, note?, status? open|paid, cost  links to customers  read by openOrders, ~markPaid, orderCount  written by ~markPaid  wakes tell  2 tests',
  )
  assert.match(
    line('query openOrders'),
    /^query openOrders {2}functions\/orders\.ts:5 {2}role staff {2}offered api {2}reads customers\.\*, orders\.\* {2}asked by ordersScreen {2}2 tests$/,
  )
  // A count reads its filter alone: here no column.
  assert.equal(line('query orderCount'), 'query orderCount  functions/orders.ts  role staff  no test')
  assert.equal(
    line('change markPaid'),
    'change markPaid  functions/orders.ts:20  role staff  danger ask  reads ~orders  writes ~orders.status  emits ~paid  called by ~ordersScreen  1 test  code',
  )
  assert.match(line('action sendNote'), / {2}anyone signed in {2}sends no {2}/)
  assert.match(line('flow tell'), / {2}on event paid, orders added {2}/)
  assert.match(
    line('screen ordersScreen'),
    /^screen ordersScreen {2}screens\/orders\.tsx {2}role staff {2}\/orders {2}asks openOrders {2}calls ~markPaid {2}imports tiny-bars {2}no test {2}code$/,
  )
  // An event, a package and a backfill carry no tests; a package says the files that use it, its browser and its ways out.
  assert.equal(line('event paid'), 'event paid  wakes tell  emitted by ~markPaid')
  assert.equal(
    line('package tiny-bars'),
    'package tiny-bars  browser  files functions/orders.ts  reaches net  imported by ordersScreen',
  )
  assert.equal(
    line('backfill stamp'),
    'backfill stamp  functions/stamp.ts  reads ~audit  writes ~audit  backfills audit  code',
  )
  // In the order of the weight, the heaviest first.
  const weights = map.lines.map((one) => one.weight)
  assert.deepEqual(
    weights,
    [...weights].sort((a, b) => b - a),
  )
  assert.equal(map.more, 0)
})

test('[55-6] the map is cut to its size by the rule of tokens, says how many were left out, and --all lifts the cut', () => {
  const whole = mapOf({ ...input(), size: 'all' })
  const cut = mapOf({ ...input(), size: 120 })
  assert.ok(cut.lines.length < whole.lines.length)
  assert.equal(cut.more, whole.lines.length - cut.lines.length)
  const lines = mapText(cut).split('\n')
  assert.equal(lines.at(-1), `${cut.more} more: forjr map --all, or forjr map <name>`)
  assert.ok(tokenCount(lines.slice(0, -1).join('\n')) <= 120)
  assert.deepEqual(
    cut.lines.map((one) => one.name),
    whole.lines.slice(0, cut.lines.length).map((one) => one.name),
  )
  // 1,500 tokens where no size is given; one input gives one text.
  assert.equal(mapOf(input()).more, 0)
  assert.equal(mapText(mapOf(input())), mapText(mapOf(input())))
})

test('[55-9] the tests of a definition read from the record: a count, no test, no words for a backfill, an event and a package', () => {
  const map = mapOf({ ...input(), size: 'all' })
  const tests = Object.fromEntries(map.lines.map((one) => [one.name, one.tests]))
  assert.deepEqual(tests.markPaid, ['tests/orders.test.ts: a staff marks it paid'])
  assert.equal(tests.openOrders?.length, 2)
  assert.deepEqual(tests.customers, [])
  for (const name of ['stamp', 'paid', 'tiny-bars']) assert.equal(tests[name], undefined, name)
  // Where the tests never ran, no line says a test, and the first line says so.
  const { tests: _, ...untested } = input()
  const none = mapOf({ ...untested, size: 'all' })
  const text = mapText(none)
  assert.match(text.split('\n')[0], / {2}no test record: run forjr test$/)
  assert.doesNotMatch(text, /\bno test\b(?! record)|\d tests?\b/)
  assert.equal(none.tests, false)
})

test('[55-6] the weights of a small graph are the shares of the walk worked out by hand: 0.15 kept of the start, 0.85 handed on, 50 rounds, 12 places', () => {
  // A door `a` that leads to `b`, which leads nowhere and hands its share back to the start. With x and y the shares
  // of the two after a round: x' = 0.15 + 0.85 y and y' = 0.85 x, so x'' = 0.15 + 0.7225 x, from x = 1 and y = 0.
  const r = 0.85 * 0.85
  const s = 0.15 / (1 - r)
  const round = (n: number): number => Math.round(n * 1e12) / 1e12
  const a = s + (1 - s) * r ** 25
  const b = 0.85 * (s + (0.15 - s) * r ** 24)
  assert.deepEqual(weighed({ nodes: ['a', 'b'], edges: [['a', 'b']], doors: ['a'] }), [
    { name: 'a', weight: round(a) },
    { name: 'b', weight: round(b) },
  ])
})

test('[55-7] a column names under may reach it, by code, each definition whose code may reach its table, also one that stands under written by', () => {
  const note = mapWord(input(), 'orders.note')
  assert.ok('mayReach' in note)
  assert.deepEqual(
    note.mayReach.map((one) => one.name),
    ['markPaid'],
  )
  const status = mapWord(input(), 'orders.status')
  assert.ok('mayReach' in status)
  assert.deepEqual(
    status.writes.map((one) => one.name),
    ['markPaid'],
  )
  assert.deepEqual(
    status.mayReach.map((one) => one.name),
    ['markPaid'],
  )
  assert.match(mapText(status), /^may reach it, by code\n {2}change markPaid {2}/m)
})

test('[55-6] a definition one of whose rules is written as code ends its line with code', () => {
  const description = mapped()
  description.tables.audit.access = {
    read: { rule: 'where', module: 'server/tables.audit.js', export: 'audit_access_read' },
  }
  description.functions.orderCount.access = {
    rule: 'allow',
    module: 'server/functions.orders.js',
    export: 'orderCount_access',
  }
  const lines = mapText(mapOf({ description, size: 'all' })).split('\n')
  assert.ok(
    lines.some((one) => /^table audit {2}.* {2}code$/.test(one)),
    lines.join('\n'),
  )
  assert.ok(
    lines.some((one) => /^query orderCount {2}.* {2}code$/.test(one)),
    lines.join('\n'),
  )
  assert.ok(
    lines.some((one) => /^table customers {2}/.test(one) && !one.endsWith('  code')),
    lines.join('\n'),
  )
})
