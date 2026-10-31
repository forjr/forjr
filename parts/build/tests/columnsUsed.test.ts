import assert from 'node:assert/strict'
import { cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Description } from '../../core/internal.ts'
import { columnsUsed } from '../../core/internal.ts'
import { describeProject } from '../index.ts'
import { errorsOf } from './projects.ts'

const root = join(import.meta.dirname, '..', '..', '..')

const used = (o: { reads?: string[]; writes?: string[]; whole?: string[]; removes?: string[] }) => ({
  reads: o.reads ?? [],
  writes: o.writes ?? [],
  whole: o.whole ?? [],
  removes: o.removes ?? [],
  known: true,
})

test('[55-3] columnsUsed of ordersByStatus of the orders example reads its filter, its link, its sort and the whole rows of both tables', async (t) => {
  // The backend of the example alone, which describes with no package of its screens installed.
  const copy = join(root, 'results', 'build', 'columns-orders')
  rmSync(copy, { recursive: true, force: true })
  t.after(() => rmSync(copy, { recursive: true, force: true }))
  for (const part of ['forjr.ts', 'tables', 'functions'])
    cpSync(join(root, 'examples', 'orders', part), join(copy, part), { recursive: true })
  const { description, findings } = await describeProject(copy)
  assert.deepEqual(errorsOf(findings), [])
  assert.deepEqual(
    columnsUsed(description, description.functions.ordersByStatus),
    used({
      reads: ['customers.name', 'orders.customer', 'orders.placedAt', 'orders.status'],
      whole: ['customers', 'orders'],
    }),
  )
  // A plan that counts reads its filter alone.
  assert.deepEqual(
    columnsUsed(description, description.functions.orderCount),
    used({ reads: ['customers.name', 'orders.customer', 'orders.status'] }),
  )
  // A function written as code that states nothing it reads by column is not known.
  assert.deepEqual(columnsUsed(description, description.functions.signIn), {
    reads: [],
    writes: [],
    whole: [],
    removes: [],
    known: false,
  })
})

const text = { kind: 'text' }
/** A description of three tables, a link between two of them, a search and a vector column. */
const described: Description = Object({
  format: 'forjr.description/2',
  app: { name: 'shop', needsEngine: '1.0' },
  project: {},
  tables: {
    customers: { columns: { name: text, city: text } },
    orders: {
      columns: {
        customer: { kind: 'link', table: 'customers' },
        status: text,
        total: { kind: 'number' },
        price: { kind: 'number' },
        note: text,
        placedAt: { kind: 'date' },
        placedBy: text,
      },
      search: ['note'],
      access: { read: { rule: 'where', filter: { col: 'placedBy', is: { caller: 'id' } } } },
      lasts: { for: 1000, where: { col: 'status', is: 'shipped' } },
    },
    docs: {
      columns: { title: text, meaning: { kind: 'vector', size: 3 } },
      search: { columns: ['title'], by: 'pieces' },
    },
  },
  functions: {},
  flows: {},
  screens: {},
  components: {},
  services: {},
  models: {},
  routes: {},
  incoming: {},
  commands: {},
  messages: {},
  assets: {},
  sources: {},
  places: {},
})

test('[55-3] a plan reads what it picks, filters, sorts, groups, sums, searches and measures; a count its filter alone', () => {
  const of = (plan: object) => columnsUsed(described, plan)
  assert.deepEqual(
    of({ from: 'orders', where: { col: 'status', is: 'open' }, pick: ['total', 'note'] }),
    used({ reads: ['orders.note', 'orders.status', 'orders.total'] }),
  )
  assert.deepEqual(
    of({ from: 'orders', where: { col: 'status', is: 'open' }, with: ['customer'], count: true }),
    used({ reads: ['orders.status'] }),
  )
  assert.deepEqual(
    of({ from: 'orders', group: { by: ['status'], values: { total: { sum: 'total' }, n: { count: true } } } }),
    used({ reads: ['orders.status', 'orders.total'] }),
  )
  assert.deepEqual(
    of({ from: 'orders', sort: [{ by: 'placedAt', down: true }], pick: ['total'] }),
    used({ reads: ['orders.placedAt', 'orders.total'] }),
  )
  assert.deepEqual(
    of({ from: 'orders', search: { input: 'words' }, pick: ['total'] }),
    used({ reads: ['orders.note', 'orders.total'] }),
  )
  assert.deepEqual(
    of({ from: 'docs', near: { col: 'meaning', value: { input: 'v' } }, search: 'a', pick: ['title'] }),
    used({ reads: ['docs.meaning', 'docs.title'] }),
  )
  // Through a link: the link column and the column it ends at; `with` reads the link and the whole linked rows.
  assert.deepEqual(
    of({ from: 'orders', where: { any: [{ col: 'customer.city', is: 'Oslo' }, { not: { col: 'total', above: 3 } }] } }),
    used({ reads: ['customers.city', 'orders.customer', 'orders.total'], whole: ['orders'] }),
  )
  assert.deepEqual(
    of({ from: 'orders', with: ['customer'] }),
    used({ reads: ['orders.customer'], whole: ['customers', 'orders'] }),
  )
})

test('[55-3] a write writes the columns of its values and reads those a value reads; a remove removes rows', () => {
  const of = (write: object) => columnsUsed(described, write)
  assert.deepEqual(
    of({ add: 'orders', values: { status: 'open', total: { col: 'price' } } }),
    used({ reads: ['orders.price'], writes: ['orders.status', 'orders.total'] }),
  )
  assert.deepEqual(
    of({ change: 'orders', id: { input: 'id' }, values: { note: 'x' } }),
    used({ writes: ['orders.note'] }),
  )
  assert.deepEqual(of({ remove: 'orders', id: { input: 'id' } }), used({ removes: ['orders'] }))
})

test('[55-3] a body is read chain by chain, as the words of a plan and of a write give it', () => {
  const body = [
    {
      const: 'found',
      value: {
        plan: { db: 'orders' },
        then: [{ where: [{ object: [['status', 'open']] }] }, { pick: [['total']] }, { all: [] }],
      },
    },
    {
      do: {
        plan: { db: 'orders', system: true },
        then: [{ change: [{ name: ['input', 'id'] }, { object: [['note', 'seen']] }] }],
      },
    },
    { do: { plan: { db: 'customers' }, then: [{ get: [{ name: ['input', 'customer'] }] }] } },
    { do: { plan: { db: 'docs' }, then: [{ remove: [{ name: ['input', 'doc'] }] }] } },
  ]
  assert.deepEqual(
    columnsUsed(described, body),
    used({
      reads: ['orders.status', 'orders.total'],
      writes: ['orders.note'],
      whole: ['customers'],
      removes: ['docs'],
    }),
  )
})

test('[55-3] a record is read through its plan, its writes, its body and its rows, a table through its where rules, and code is not known', () => {
  assert.deepEqual(
    columnsUsed(described, { kind: 'query', form: 'plain', plan: { from: 'orders', pick: ['total'] } }),
    used({ reads: ['orders.total'] }),
  )
  assert.deepEqual(
    columnsUsed(described, {
      kind: 'change',
      form: 'plain',
      writes: [{ change: 'orders', id: { input: 'id' }, values: { status: 'paid' } }],
    }),
    used({ writes: ['orders.status'] }),
  )
  // Code that is handed rows is still code: its rows say nothing of what it does.
  assert.deepEqual(
    columnsUsed(described, { kind: 'action', form: 'code', rows: { recent: { from: 'orders', pick: ['placedAt'] } } }),
    { reads: [], writes: [], whole: [], removes: [], known: false },
  )
  assert.deepEqual(
    columnsUsed(described, described.tables.orders),
    used({ reads: ['orders.placedBy', 'orders.status'] }),
  )
  assert.deepEqual(columnsUsed(described, { kind: 'change', form: 'code', reads: ['orders'], touches: ['orders'] }), {
    reads: [],
    writes: [],
    whole: [],
    removes: [],
    known: false,
  })
})
