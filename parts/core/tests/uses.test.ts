import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Description, SeenInCode, Use } from '../internal.ts'
import { usesOf } from '../internal.ts'

const text = { kind: 'text' }
const staff = { rule: 'role', role: 'staff' }
const signedIn = { rule: 'signedIn' }
const code = (name: string): object => ({ module: `server/${name}.js`, export: name })

/** A description that holds each field of the table of the graph, every other part empty. */
function graphed(): Description {
  return Object({
    format: 'forjr.description/2',
    app: { name: 'shop', needsEngine: '1.0' },
    project: {},
    tables: {
      customers: {
        columns: {
          name: text,
          // A count kept of the orders that link to a customer.
          openOrders: { kind: 'number', keeps: { do: 'count', of: 'orders', by: 'customer' } },
        },
        access: { read: signedIn },
      },
      orders: {
        columns: {
          customer: { kind: 'link', table: 'customers' },
          tags: { kind: 'list', of: { kind: 'link', table: 'tags' } },
          summary: { kind: 'text', optional: true, by: { work: 'summarize' } },
          meaning: { kind: 'vector', size: 3, model: 'embedder' },
        },
        access: { read: { rule: 'where', filter: { col: 'customer.name', is: 'x' } } },
        reaches: ['customers'],
      },
      tags: { columns: { word: text } },
      messages: { columns: { body: text } },
      members: { columns: { name: text } },
    },
    functions: {
      ordersByStatus: {
        kind: 'query',
        form: 'plain',
        access: staff,
        plan: { from: 'orders' },
        reads: ['orders', 'customers'],
        offer: ['api', 'mcp'],
      },
      addOrder: {
        kind: 'change',
        form: 'plain',
        access: signedIn,
        writes: [{ add: 'orders', values: { customer: { input: 'customer' } } }],
        touches: ['orders'],
      },
      markPaid: { kind: 'change', form: 'code', access: staff, touches: ['orders.status'], ...code('markPaid') },
      refund: {
        kind: 'action',
        form: 'code',
        access: { rule: 'allow', module: 'server/refund.js', export: 'refund_access' },
        reaches: ['members'],
        uses: ['addOrder', 'mail.send'],
        ...code('refund'),
      },
      summarize: {
        kind: 'action',
        form: 'plain',
        access: staff,
        body: [
          { const: 'found', value: { plan: { db: 'orders' }, then: [{ all: [] }] } },
          { do: { plan: { db: 'tags', system: true }, then: [{ add: [{ object: [['word', 'x']] }] }] } },
          { do: { call: { function: 'addOrder' }, args: [] } },
          { do: { call: { service: 'slack', call: 'post' }, args: [] } },
          { do: { call: { model: 'writer', call: 'reply' }, args: [] } },
          { do: { fn: 'emit', args: ['paid', {}] } },
          { do: { fn: 'start', args: [{ flow: 'ship' }] } },
        ],
      },
      churn: {
        kind: 'action',
        form: 'code',
        access: staff,
        python: { file: 'ml/churn.py' },
        uses: ['ordersByStatus'],
      },
      checkInput: { kind: 'query', form: 'code', access: staff, ...code('checkInput') },
      shorten: { kind: 'action', form: 'code', access: staff, ...code('shorten') },
      wordsFree: { kind: 'action', form: 'code', access: staff, ...code('wordsFree') },
    },
    flows: {
      ship: {
        form: 'plain',
        on: [{ table: 'orders', when: 'added' }, { event: 'paid' }, { incoming: 'stripeHook' }, { every: '1 hour' }],
        body: [],
      },
      nightly: { form: 'code', on: [{ cron: '0 9 * * *', zone: 'UTC' }], ...code('nightly') },
      helper: {
        form: 'code',
        offer: ['mcp'],
        agent: {
          model: 'writer',
          access: signedIn,
          tools: ['ordersByStatus', { tool: 'refund', tries: 2 }, 'ship'],
          memory: { in: 'messages', shrink: { function: 'shorten' }, model: 'embedder' },
          guards: {
            in: ['checkInput', { judge: { model: 'judgeModel', rule: 'kind' } }],
            out: [{ ours: 'noPersonal' }],
          },
          handsOver: ['other'],
          score: { share: 0.1, with: { judge: { model: 'judgeModel', rule: 'good' } } },
        },
      },
      other: { form: 'code', agent: { model: 'writer', tools: [] } },
    },
    screens: {
      ordersScreen: {
        path: '/orders',
        access: staff,
        data: { orders: { query: 'ordersByStatus' }, working: { query: 'helper.working' } },
        calls: ['markPaid', 'helper.approve'],
        uses: ['PriceTag', 'Spinner'],
        layout: 'Frame',
        loading: 'Spinner',
        seo: { addresses: { query: 'checkInput' } },
      },
      missing: { for: 'notFound', access: { rule: 'anyone', why: '' } },
    },
    components: {
      PriceTag: { data: { rates: { action: 'refund' } }, uses: [] },
      Frame: { uses: [] },
      Spinner: { uses: [] },
    },
    services: { slack: { url: 'https://slack.example.com', calls: { post: {}, status: {} } } },
    models: {
      writer: { provider: 'anthropic', name: 'w', fallback: ['embedder'], call: { service: 'slack', call: 'post' } },
      embedder: { provider: 'openai', name: 'e', job: { check: { service: 'slack', call: 'status' } } },
      judgeModel: { provider: 'openai', name: 'j' },
    },
    routes: { feed: { method: 'GET', path: '/feed.xml', access: { rule: 'anyone', why: 'a feed' }, ...code('feed') } },
    incoming: { stripeHook: { path: '/hooks/stripe', then: 'ship', open: 'nobody signs' } },
    commands: { chat: { access: staff, ...code('chat') } },
    backfills: { splitNames: { table: 'customers', run: code('splitNames') } },
    packages: {
      'tiny-bars': { by: ['screen:ordersScreen', 'component:PriceTag', 'backend:functions/orders.ts'], browser: true },
    },
    messages: {},
    assets: {},
    sources: {},
    places: {},
  })
}

const seen: SeenInCode = {
  markPaid: {
    reads: ['orders'],
    writes: ['orders'],
    sets: ['orders.status'],
    calls: ['addOrder', 'helper.approve'],
    starts: ['ship'],
    emits: ['shipped'],
  },
  feed: { reads: ['customers'], writes: [], sets: [], calls: [], starts: [], emits: ['paid'] },
  splitNames: {
    reads: ['customers'],
    writes: ['customers'],
    sets: ['customers.name'],
    calls: [],
    starts: [],
    emits: [],
  },
}

/** The edges of a graph that leave a node, as `<kind> <to> <by>`. */
const outOf = (uses: ReturnType<typeof usesOf>, name: string): string[] =>
  uses.out(name).map((one) => `${one.kind} ${one.to} ${one.by}`)

test('[55-1] the graph holds each edge of each field of the table, both ways, with its kind, known but where it was seen in code', () => {
  const uses = usesOf(graphed(), seen)
  const edge = (from: string, kind: string, to: string, by: 'known' | 'seen' = 'known'): void => {
    const one: Use = { from, to, kind: Object(kind), by }
    assert.ok(
      uses.out(from).some((held) => JSON.stringify(held) === JSON.stringify(one)),
      `${from} ${kind} ${to} ${by} out: ${JSON.stringify(uses.out(from))}`,
    )
    assert.ok(
      uses.in(to).some((held) => JSON.stringify(held) === JSON.stringify(one)),
      `${from} ${kind} ${to} ${by} in: ${JSON.stringify(uses.in(to))}`,
    )
  }
  // reads: `reads` of a function, each plan of `rows`, each chain of a body, and what the code was seen to read.
  edge('ordersByStatus', 'reads', 'orders')
  edge('ordersByStatus', 'reads', 'customers')
  edge('summarize', 'reads', 'orders')
  edge('markPaid', 'reads', 'orders', 'seen')
  edge('feed', 'reads', 'customers', 'seen')
  edge('splitNames', 'reads', 'customers', 'seen')
  // writes: `touches`, a column by its table, each write of a body; known wins over seen.
  edge('addOrder', 'writes', 'orders')
  edge('markPaid', 'writes', 'orders')
  edge('summarize', 'writes', 'tags')
  edge('splitNames', 'writes', 'customers', 'seen')
  // ruleReads: `reaches` of a table and of a function.
  edge('orders', 'ruleReads', 'customers')
  edge('refund', 'ruleReads', 'members')
  // links: a link column, and a list of links.
  edge('orders', 'links', 'customers')
  edge('orders', 'links', 'tags')
  // asks: `data` by query and action, a member of an agent by its agent, and the addresses of `seo`.
  edge('ordersScreen', 'asks', 'ordersByStatus')
  edge('ordersScreen', 'asks', 'helper')
  edge('ordersScreen', 'asks', 'checkInput')
  edge('PriceTag', 'asks', 'refund')
  // calls: the calls of a view, which the build saw; the calls of a body; the calls the code was seen to make.
  edge('ordersScreen', 'calls', 'markPaid', 'seen')
  edge('ordersScreen', 'calls', 'helper', 'seen')
  edge('summarize', 'calls', 'addOrder')
  edge('markPaid', 'calls', 'addOrder', 'seen')
  edge('markPaid', 'calls', 'helper', 'seen')
  // starts: a body's start, `then` of an incoming call, and what the code was seen to start.
  edge('summarize', 'starts', 'ship')
  edge('stripeHook', 'starts', 'ship')
  edge('markPaid', 'starts', 'ship', 'seen')
  // draws: `uses`, `loading` and `layout`.
  edge('ordersScreen', 'draws', 'PriceTag')
  edge('ordersScreen', 'draws', 'Spinner')
  edge('ordersScreen', 'draws', 'Frame')
  // uses: `uses` of an action and of a `python`.
  edge('refund', 'uses', 'addOrder')
  edge('churn', 'uses', 'ordersByStatus')
  // holds: tools, guards that name a function, `handsOver`, `memory.shrink`.
  edge('helper', 'holds', 'ordersByStatus')
  edge('helper', 'holds', 'refund')
  edge('helper', 'holds', 'ship')
  edge('helper', 'holds', 'checkInput')
  edge('helper', 'holds', 'other')
  edge('helper', 'holds', 'shorten')
  // model: an agent's model and memory model, its judges, a body's call of a model, a vector, a fallback.
  edge('helper', 'model', 'writer')
  edge('helper', 'model', 'embedder')
  edge('helper', 'model', 'judgeModel')
  edge('summarize', 'model', 'writer')
  edge('orders', 'model', 'embedder')
  edge('writer', 'model', 'embedder')
  // service: a body's call of a service, `call` and `job.check` of a model.
  edge('summarize', 'service', 'slack')
  edge('writer', 'service', 'slack')
  edge('embedder', 'service', 'slack')
  // memory, on, emits, filledBy, keeps, backfills, imports.
  edge('helper', 'memory', 'messages')
  edge('ship', 'on', 'orders')
  edge('ship', 'on', 'event:paid')
  edge('ship', 'on', 'stripeHook')
  edge('summarize', 'emits', 'event:paid')
  edge('markPaid', 'emits', 'event:shipped', 'seen')
  edge('feed', 'emits', 'event:paid', 'seen')
  edge('orders', 'filledBy', 'summarize')
  edge('customers', 'keeps', 'orders')
  edge('splitNames', 'backfills', 'customers')
  edge('ordersScreen', 'imports', 'package:tiny-bars')
  edge('PriceTag', 'imports', 'package:tiny-bars')
})

test('[55-1] two fields that lead to one node with one kind make one edge, and a member of a handle makes none', () => {
  const uses = usesOf(graphed(), seen)
  // `touches` and what was seen both write orders: one edge, known.
  assert.deepEqual(
    uses.out('markPaid').filter((one) => one.kind === 'writes'),
    [{ from: 'markPaid', to: 'orders', kind: 'writes', by: 'known' }],
  )
  // `helper.approve` and `helper.working` lead to the agent; `mail.send` leads to no node.
  assert.equal(
    uses.out('refund').some((one) => one.to.startsWith('mail')),
    false,
  )
  assert.equal(uses.nodes.has('mail'), false)
  assert.equal(uses.nodes.has('helper.approve'), false)
  // The edges of a node stand in the order of the names they lead to.
  const names = uses.out('helper').map((one) => one.to)
  assert.deepEqual(names, [...names].sort())
})

test('[55-1] each definition, backfill, package and named event is a node with its kind, its doors and whether code may reach more', () => {
  const uses = usesOf(graphed(), seen)
  const node = (name: string) => uses.nodes.get(name)
  assert.deepEqual(node('ordersByStatus'), {
    name: 'ordersByStatus',
    kind: 'query',
    doors: ['offered api', 'offered mcp'],
    code: false,
  })
  assert.deepEqual(node('ordersScreen')?.doors, ['/orders'])
  assert.deepEqual(node('missing')?.doors, ['for notFound'])
  assert.deepEqual(node('feed')?.doors, ['GET /feed.xml'])
  assert.deepEqual(node('stripeHook')?.doors, ['/hooks/stripe'])
  assert.deepEqual(node('chat')?.doors, ['command chat'])
  assert.deepEqual(node('ship')?.doors, ['every 1 hour'])
  assert.deepEqual(node('nightly')?.doors, ['cron 0 9 * * *'])
  assert.deepEqual(node('helper')?.doors, ['offered mcp'])
  // The kind of each, as the graph names it.
  const kinds = Object.fromEntries([...uses.nodes].map(([name, one]) => [name, one.kind]))
  assert.equal(kinds.churn, 'python')
  assert.equal(kinds.helper, 'agent')
  assert.equal(kinds.ship, 'flow')
  assert.equal(kinds.stripeHook, 'incoming')
  assert.equal(kinds.splitNames, 'backfill')
  assert.equal(kinds['event:paid'], 'event')
  assert.equal(kinds['event:shipped'], 'event')
  assert.equal(kinds['package:tiny-bars'], 'package')
  assert.equal(kinds.shop, undefined)
  // Code is said where code may reach more than its edges, never guessed.
  const coded = (name: string): boolean | undefined => node(name)?.code
  for (const name of [
    'markPaid',
    'refund',
    'churn',
    'nightly',
    'helper',
    'feed',
    'chat',
    'splitNames',
    'ordersScreen',
    'PriceTag',
  ])
    assert.equal(coded(name), true, name)
  for (const name of ['ordersByStatus', 'summarize', 'ship', 'orders', 'writer', 'slack', 'stripeHook', 'event:paid'])
    assert.equal(coded(name), false, name)
})

test('[55-1] a code function that states nothing and names no table has no reads or writes edge, and code', () => {
  const uses = usesOf(graphed())
  assert.deepEqual(
    uses.out('wordsFree').filter((one) => one.kind === 'reads' || one.kind === 'writes'),
    [],
  )
  assert.equal(uses.nodes.get('wordsFree')?.code, true)
  // With no record of what was seen, nothing is seen.
  assert.equal(
    [...uses.nodes.keys()].some((name) =>
      uses.out(name).some((one) => one.by === 'seen' && one.from !== 'ordersScreen'),
    ),
    false,
  )
})

test('[55-1] one description and one record of what was seen give one graph', () => {
  const graphOf = (uses: ReturnType<typeof usesOf>): string =>
    JSON.stringify([...uses.nodes].map(([name, node]) => [node, outOf(uses, name), uses.in(name)]))
  assert.equal(graphOf(usesOf(graphed(), seen)), graphOf(usesOf(graphed(), seen)))
  assert.notEqual(graphOf(usesOf(graphed(), seen)), graphOf(usesOf(graphed())))
})
