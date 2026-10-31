import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { checkProject } from '../index.ts'
import { checkRules } from '../ours.ts'
import { copyOf, lineWith } from './copies.ts'

const root = join(import.meta.dirname, '..', '..', '..')

/** Writes a project of the given files into a folder of its own under `results/`, and answers the folder. */
function projectOf(name: string, files: Record<string, string>): string {
  const folder = join(root, 'results', 'check', `rule-${name}`)
  rmSync(folder, { recursive: true, force: true })
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
  return folder
}

const shop = "import { project } from 'forjr'\n\nexport const shop = project('shop', { title: 'Shop' })\n"

const users =
  "export const users = table('users', { columns: { name: text(), roles: list(text()) }, access: { read: 'signedIn' } })\n"

test('[15-1] the type checker reads a command file too: a type error in it is F8000', async () => {
  const folder = projectOf('command-types', {
    'forjr.ts': shop,
    'commands/greet.ts': [
      "import { command } from 'forjr/cli'",
      '',
      "export const greet = command('greet', {",
      "  about: 'Greets',",
      '  run: async ({ terminal }) => {',
      "    const wrong: number = 'text'",
      '    terminal.write(String(wrong))',
      '  },',
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkProject(folder)
  assert.deepEqual(
    findings.filter((one) => one.code === 'F8000').map((one) => one.where?.file),
    ['commands/greet.ts'],
  )
})

test('[16-2] F2005: a link of the input of a flow that names a table which the project does not hold', async () => {
  const folder = projectOf('flow-link', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { flow, link, list, table, text } from 'forjr'",
      '',
      users,
      "export const remind = flow('remind', {",
      "  input: { person: link('people') },",
      '  run: async ({ step }) => {',
      "    await step('one', () => 1)",
      '  },',
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkRules(folder)
  assert.ok(
    findings.some((one) => one.code === 'F2005' && /people/.test(one.message)),
    findings.map((one) => `${one.code} ${one.message}`).join('\n'),
  )
})

test('[16-2] F2015: `columns` in the `by` of a column that is no vector with a model is F2015', async () => {
  const folder = projectOf('by-columns', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { list, table, text } from 'forjr'",
      '',
      users,
      "export const notes = table('notes', {",
      "  columns: { body: text(), short: text({ optional: true, by: { columns: ['body'] } }) },",
      "  access: { read: 'signedIn' },",
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => one.code),
    ['F2015'],
    findings.map((one) => `${one.code} ${one.message}`).join('\n'),
  )
})

test("[16-2] F2016: a table whose `shows` is a word other than 'counts' or 'scores' is F2016", async () => {
  const folder = projectOf('shows-other', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { list, table, text } from 'forjr'",
      '',
      users,
      "export const usage = table('usage', { shows: 'calls', access: { read: 'owner' } })",
      '',
    ].join('\n'),
  })
  const { findings } = await checkRules(folder)
  assert.ok(
    findings.some((one) => one.code === 'F2016'),
    findings.map((one) => `${one.code} ${one.message}`).join('\n'),
  )
})

/** Holds that our rules find a code in a project, at a definition where one is named. */
async function finds(folder: string, code: string, definition?: string): Promise<void> {
  const { findings } = await checkRules(folder)
  assert.ok(
    findings.some((one) => one.code === code && (definition === undefined || one.where?.definition === definition)),
    `${code} is found, among:\n${findings.map((one) => `${one.code} ${one.message}`).join('\n')}`,
  )
}

const notes = "export const notes = table('notes', { columns: { body: text() }, access: { read: 'signedIn' } })\n"

test('[15-1@4] F3004: a route that uses full access and states no `system`', async () => {
  const folder = projectOf('route-system', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { list, route, table, text } from 'forjr'",
      '',
      users,
      notes,
      "export const feed = route('feed', {",
      "  method: 'GET',",
      "  path: '/feed',",
      "  access: 'signedIn',",
      '  run: async ({ db }) => {',
      "    db.system.notes.add({ body: 'seen' })",
      "    return new Response('ok')",
      '  },',
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F3004', 'feed')
})

test('[15-1@7b] F3004: a flow that runs as its starter and uses full access', async () => {
  const folder = projectOf('starter-system', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { flow, list, table, text } from 'forjr'",
      '',
      users,
      notes,
      "export const tidy = flow('tidy', {",
      "  as: 'starter',",
      '  run: async ({ step, db }) => {',
      "    await step('one', () => db.system.notes.add({ body: 'tidied' }))",
      '  },',
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F3004', 'tidy')
})

test("[15-1@4] F3003: a reason of spaces alone is no reason, so a read of personal data open to anyone(' ') is found", async () => {
  const folder = projectOf('personal-spaces', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { anyone, list, table, text } from 'forjr'",
      '',
      users,
      "export const people = table('people', {",
      '  columns: { email: text({ personal: true }) },',
      "  access: { read: anyone(' ') },",
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F3003', 'people')
})

test('[15-1@4] F3009: a read through `db` of another table holds no row of the table it writes to its caller', async () => {
  const folder = projectOf('caller-elsewhere', {
    'forjr.ts': shop,
    'functions/orders.ts': [
      "import { boolean, change, link, list, table, text } from 'forjr'",
      '',
      users,
      notes,
      "export const orders = table('orders', {",
      "  columns: { title: text(), placedBy: link('users'), paid: boolean({ default: false }) },",
      "  owner: 'placedBy',",
      "  access: { read: 'owner', add: 'signedIn', change: 'owner' },",
      '})',
      '',
      "export const markPaid = change('markPaid', {",
      "  access: 'signedIn',",
      "  system: 'an order is marked paid when its payment arrives',",
      "  input: { order: link('orders') },",
      '  run: ({ db, input }) => {',
      '    if (db.notes.count() > 100) return',
      '    db.system.orders.change(input.order, { paid: true })',
      '  },',
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F3009', 'markPaid')
})

test("[12-3b] F4005: an `async` arrow handed to `each` in a screen's `data`, where nothing may be waited for", async () => {
  const folder = projectOf('each-in-data', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { input, list, query, table, text } from 'forjr'",
      '',
      users,
      notes,
      "export const someNotes = query('someNotes', {",
      "  access: 'signedIn',",
      '  input: { bodies: list(text()) },',
      "  rows: notes.where({ body: { in: input('bodies') } }).limit(20),",
      '})',
      '',
    ].join('\n'),
    'screens/notes.tsx': [
      "import { each, read, screen } from 'forjr/ui'",
      "import { someNotes } from '../functions/notes'",
      '',
      "export const notesScreen = screen('notesScreen', {",
      "  path: '/notes',",
      "  access: 'signedIn',",
      "  data: () => ({ notes: read(someNotes, { bodies: each(['a', 'b'], async (one) => one) }) }),",
      '  view: ({ notes }) => <span>{notes?.length}</span>,',
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F4005', 'notesScreen')
})

test('[51-2] [15-1@7b] F5007: `machineSeconds` in `limits.perDay` of a `python`, a limit of a definition', async () => {
  const folder = projectOf('machine-seconds', {
    'forjr.ts': shop,
    'work/sum.py': 'def run(input):\n    return 1\n',
    'functions/work.ts': [
      "import { list, number, python, table, text } from 'forjr'",
      '',
      users,
      "export const sum = python('sum', {",
      "  file: 'work/sum.py',",
      "  access: 'signedIn',",
      '  input: {},',
      '  output: number(),',
      '  limits: { perDay: { machineSeconds: 60 } },',
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F5007', 'sum')
})

test('[32-9] a `message(...)` that a view writes among its elements passes the type checker', async () => {
  const folder = projectOf('word-in-view', {
    'forjr.ts': shop,
    'functions/users.ts': ["import { list, table, text } from 'forjr'", '', users].join('\n'),
    'messages/en.ts':
      "import { messages } from 'forjr/ui'\n\nexport default messages('en', { orders: { title: 'Orders' } })\n",
    'screens/orders.tsx': [
      "import { screen, message } from 'forjr/ui'",
      '',
      "export const ordersScreen = screen('ordersScreen', {",
      "  path: '/orders',",
      "  access: 'anyone',",
      "  view: () => <h1>{message('orders.title')}</h1>,",
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkProject(folder)
  assert.deepEqual(
    findings.map((one) => `${one.code} ${one.where?.file}:${one.where?.line} ${one.message}`),
    [],
  )
})

test('[23-5] F5001: a function of the file that is named `now` is no word that is drawn', async () => {
  const folder = projectOf('own-now', {
    'forjr.ts': shop,
    'flows/tidy.ts': [
      "import { flow, list, table, text } from 'forjr'",
      '',
      users,
      'const now = (): number => 1',
      '',
      "export const tidy = flow('tidy', {",
      '  run: async ({ step }) => {',
      '    const n = now()',
      "    await step('one', () => n)",
      '  },',
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => `${one.code} ${one.message}`),
    [],
  )
})

test('[51-2] [15-1@7b] F5008: a `batch` that states `split` on a definition that does not state `sends: false` is a note', async () => {
  const folder = projectOf('batch-split', {
    'forjr.ts': shop,
    'functions/work.ts': [
      "import { action, list, number, table, text } from 'forjr'",
      '',
      users,
      "export const encode = action('encode', {",
      "  access: 'signedIn',",
      '  batch: { max: 10, split: true },',
      '  input: { n: number() },',
      '  run: async ({ entries }) => entries.map((one) => one.input.n),',
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.level, one.where?.definition, /split/.test(one.message)]),
    [['F5008', 'note', 'encode', true]],
  )
})

test('[51-12] F2015: the `input` of a filled column that reads through a link into another file', async () => {
  const folder = projectOf('filled-across', {
    'forjr.ts': shop,
    'functions/notes.ts': [
      "import { action, link, list, table, text } from 'forjr'",
      '',
      users,
      "export const teams = table('teams', { columns: { name: text() }, access: { read: 'signedIn' } })",
      '',
      "export const summarize = action('summarize', {",
      "  access: 'nobody',",
      "  system: 'fills the summary of a note',",
      '  input: { by: text() },',
      '  output: text(),',
      '  run: async ({ input }) => input.by,',
      '})',
      '',
      "export const notes = table('notes', {",
      '  columns: {',
      "    team: link('teams', { onRemove: 'remove' }),",
      "    author: link('users', { onRemove: 'clear', optional: true }),",
      "    summary: text({ optional: true, by: { work: summarize, input: { by: 'author.name' } } }),",
      '  },',
      "  tenant: 'team',",
      "  access: { read: 'signedIn' },",
      '})',
      '',
    ].join('\n'),
  })
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.filter((one) => one.code === 'F2015').map((one) => /another file/.test(one.message)),
    [true],
    findings.map((one) => `${one.code} ${one.message}`).join('\n'),
  )
})

test('[32-7] F6007: a screen and a redirect that fit exactly the same addresses', async () => {
  const folder = projectOf('screen-redirect', {
    'forjr.ts': [
      "import { project } from 'forjr'",
      '',
      "export const shop = project('shop', { title: 'Shop', redirects: [{ from: '/orders/:id', to: '/list' }] })",
      '',
    ].join('\n'),
    'functions/users.ts': ["import { list, table, text } from 'forjr'", '', users].join('\n'),
    'screens/order.tsx': [
      "import { screen } from 'forjr/ui'",
      '',
      "export const orderScreen = screen('orderScreen', {",
      "  path: '/orders/:order',",
      "  access: 'signedIn',",
      '  view: () => <main>an order</main>,',
      '})',
      '',
    ].join('\n'),
  })
  await finds(folder, 'F6007')
})

test('[30-7] F6013: a literal `src` of an `Image` and a literal `href` of a `head` link of a kind that is not allowed', async () => {
  const screenOf = (name: string, line: string) =>
    [
      "import { Image, screen } from 'forjr/ui'",
      '',
      `export const ${name} = screen('${name}', {`,
      `  path: '/${name}',`,
      "  access: 'signedIn',",
      line,
      '})',
      '',
    ].join('\n')
  const folder = projectOf('kinds-of-address', {
    'forjr.ts': shop,
    'functions/users.ts': ["import { list, table, text } from 'forjr'", '', users].join('\n'),
    'screens/picture.tsx': screenOf(
      'picture',
      '  view: () => <Image src="javascript:alert(1)" alt="A picture" width={10} height={10} />,',
    ),
    'screens/headed.tsx': screenOf(
      'headed',
      "  head: [{ link: { rel: 'alternate', href: 'javascript:alert(1)' } }],\n  view: () => <main>headed</main>,",
    ),
  })
  await finds(folder, 'F6013', 'picture')
  await finds(folder, 'F6013', 'headed')
})

/** A project of one screen kept as `public`, whose file is written by the test. */
const publicScreen = (name: string, file: string): string =>
  projectOf(name, {
    'forjr.ts': shop,
    'functions/users.ts': ["import { list, table, text } from 'forjr'", '', users].join('\n'),
    'screens/front.tsx': file,
  })

test('[32-11] F6030: a screen kept as `public` whose view calls `useUser`', async () => {
  const folder = publicScreen(
    'public-use-user',
    [
      "import { screen, useUser } from 'forjr/ui'",
      '',
      "export const front = screen('front', {",
      "  path: '/',",
      "  access: 'anyone',",
      '  cache: { for: 60_000, public: true },',
      '  view: () => {',
      '    const me = useUser()',
      "    return <main>{me ? 'hello' : 'welcome'}</main>",
      '  },',
      '})',
      '',
    ].join('\n'),
  )
  await finds(folder, 'F6030', 'front')
})

test("[26-6] [15-1@9a] F7003: `countBy: 'app'` on a kind of worker that states `perCallerPerDay`", async () => {
  const folder = projectOf('kind-count-by', {
    'forjr.ts': [
      "import { project } from 'forjr'",
      '',
      "export const shop = project('shop', {",
      "  title: 'Shop',",
      "  workers: { gpu: { countBy: 'app', limits: { perCallerPerDay: { workSeconds: 60 } } } },",
      '})',
      '',
    ].join('\n'),
    'functions/users.ts': ["import { list, table, text } from 'forjr'", '', users].join('\n'),
  })
  await finds(folder, 'F7003')
})

test('[32-11] F6030: a screen kept as `public` that uses a component which reads `user` and does not state `personal: true`', async () => {
  const folder = publicScreen(
    'public-component',
    [
      "import { component, screen } from 'forjr/ui'",
      '',
      "export const Greeting = component('Greeting', {",
      "  view: ({ user }) => <span>{user ? user.id : 'welcome'}</span>,",
      '})',
      '',
      "export const front = screen('front', {",
      "  path: '/',",
      "  access: 'anyone',",
      '  cache: { for: 60_000, public: true },',
      '  view: () => (',
      '    <main>',
      '      <Greeting />',
      '    </main>',
      '  ),',
      '})',
      '',
    ].join('\n'),
  )
  await finds(folder, 'F6030', 'front')
})

test('[30-7] F6013: an `href` of `then` worked out from a text that starts with a path of the app, and not one worked out from an address of another site', async () => {
  const folder = copyOf(join('F6013', 'pass'), 'F6013-worked-href')
  const text = [
    "import { Form, screen } from 'forjr/ui'",
    "import { addOrder } from '../functions/orders'",
    '',
    "export const movedScreen = screen('movedScreen', {",
    "  path: '/moved',",
    "  access: 'signedIn',",
    '  view: () => {',
    "    const id = 'one'",
    '    return (',
    '      <div>',
    `        <Form call={addOrder} then={{ href: \`/orders/\${id}\` }}>`,
    '          <button type="submit">Here</button>',
    '        </Form>',
    "        <Form call={addOrder} then={{ href: '/orders/' + id }}>",
    '          <button type="submit">Here too</button>',
    '        </Form>',
    `        <Form call={addOrder} then={{ href: \`https://example.com/orders/\${id}\` }}>`,
    '          <button type="submit">There</button>',
    '        </Form>',
    '      </div>',
    '    )',
    '  },',
    '})',
    '',
  ].join('\n')
  writeFileSync(join(folder, 'screens', 'moved.tsx'), text)
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.where?.file, one.where?.line, /goTo/.test(one.fix ?? '')]),
    [
      ['F6013', 'screens/moved.tsx', lineWith(text, 'href: `/orders/'), true],
      ['F6013', 'screens/moved.tsx', lineWith(text, "href: '/orders/' + id"), true],
    ],
    findings.map((one) => `${one.code} ${one.where?.line} ${one.message}`).join('\n'),
  )
})

test('[15-1@4] F3004: `for` on a call of a service, and a user handed to `connections` or `grants`, in an action that states no `system`, and not in one that does', async () => {
  const fileOf = (system: string[]): string =>
    [
      "import { action, post, secret, service, text } from 'forjr'",
      '',
      "export const slack = service('slack', {",
      "  url: 'https://slack.com/api',",
      "  auth: { bearer: secret('SLACK_TOKEN') },",
      "  calls: { postMessage: post('/chat.postMessage', { input: { channel: text(), text: text() } }) },",
      '})',
      '',
      "export const tell = action('tell', {",
      "  access: 'signedIn',",
      ...system,
      '  input: { user: text() },',
      '  run: async ({ input, connections, grants }) => {',
      "    await slack.postMessage({ channel: 'news', text: 'hello' }, { for: input.user })",
      '    connections.list(input.user)',
      '    grants.list(input.user)',
      '    await connections.end(slack, { user: input.user })',
      '    connections.list()',
      "    await slack.postMessage({ channel: 'news', text: 'hello' })",
      '  },',
      '})',
      '',
    ].join('\n')
  const folder = copyOf(join('F3004', 'functions', 'pass'), 'F3004-for-and-user')
  const text = fileOf([])
  writeFileSync(join(folder, 'functions', 'tell.ts'), text)
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.where?.definition, one.where?.line]),
    [
      ['F3004', 'tell', lineWith(text, '{ for: input.user }')],
      ['F3004', 'tell', lineWith(text, 'connections.list(input.user)')],
      ['F3004', 'tell', lineWith(text, 'grants.list(input.user)')],
      ['F3004', 'tell', lineWith(text, 'connections.end(slack, { user')],
    ],
    findings.map((one) => `${one.code} ${one.where?.line} ${one.message}`).join('\n'),
  )
  writeFileSync(join(folder, 'functions', 'tell.ts'), fileOf(["  system: 'tells the news for any user',"]))
  assert.deepEqual((await checkRules(folder)).findings, [])
})

test('[15-1@4] [15-1@7b] F3004: a route that states no `system`, and a flow that runs as its starter, each using full access and waiting for a flow that has it', async () => {
  const cases: [string, string, [string, string][]][] = [
    [
      'routes',
      'functions/feed.ts',
      [
        ['feed', 'db.system.notes.count'],
        ['tidyNow', 'await tidy()'],
      ],
    ],
    [
      'starters',
      'flows/tidy.ts',
      [
        ['tidy', 'db.system.notes.count'],
        ['tidy', '() => sweep()'],
      ],
    ],
  ]
  for (const [name, file, places] of cases) {
    const folder = copyOf(join('F3004', name, 'fail'), `F3004-${name}-cases`)
    const text = readFileSync(join(folder, file), 'utf8')
    const { findings } = await checkRules(folder)
    assert.deepEqual(
      findings.map((one) => [one.code, one.where?.file, one.where?.definition, one.where?.line]),
      places.map(([definition, piece]) => ['F3004', file, definition, lineWith(text, piece)]),
      findings.map((one) => `${one.code} ${one.where?.line} ${one.message}`).join('\n'),
    )
    const passing = await checkRules(copyOf(join('F3004', name, 'pass'), `F3004-${name}-passing`))
    assert.deepEqual(passing.findings, [], name)
  }
})

test('[16-2] F2005: a link that names a table which the project does not hold, in an argument of a command and in the input of a call of a service', async () => {
  const folder = copyOf(join('F3004', 'functions', 'pass'), 'F2005-command-service')
  mkdirSync(join(folder, 'commands'))
  writeFileSync(
    join(folder, 'commands', 'greet.ts'),
    [
      "import { command, link } from 'forjr/cli'",
      '',
      "export const greet = command('greet', {",
      "  about: 'Greets a person',",
      "  args: { person: link('people') },",
      '  run: async ({ terminal }) => {',
      "    terminal.write('hello')",
      '  },',
      '})',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(folder, 'functions', 'slack.ts'),
    [
      "import { link, post, secret, service } from 'forjr'",
      '',
      "export const slack = service('slack', {",
      "  url: 'https://slack.com/api',",
      "  auth: { bearer: secret('SLACK_TOKEN') },",
      "  calls: { postMessage: post('/chat.postMessage', { input: { channel: link('channels') } }) },",
      '})',
      '',
    ].join('\n'),
  )
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.where?.definition, /`(people|channels)`/.exec(one.message)?.[1]]).sort(),
    [
      ['F2005', 'greet', 'people'],
      ['F2005', 'slack', 'channels'],
    ],
    findings.map((one) => `${one.code} ${one.message}`).join('\n'),
  )
})

test('[32-11] F6030: a screen kept as `public` that uses a personal part which reads `user`, or names a `user` of its own, is no warning', async () => {
  const folder = copyOf(join('F6030', 'pass'), 'F6030-personal-own')
  writeFileSync(
    join(folder, 'screens', 'front.tsx'),
    [
      "import { component, screen } from 'forjr/ui'",
      '',
      "export const Greeting = component('Greeting', {",
      '  personal: true,',
      "  view: ({ user }) => <span>{user ? user.id : 'welcome'}</span>,",
      '})',
      '',
      "export const front = screen('front', {",
      "  path: '/',",
      "  access: 'anyone',",
      '  cache: { for: 60_000, public: true },',
      '  view: () => {',
      "    const user = { name: 'a guest' }",
      '    return (',
      '      <main>',
      '        <Greeting /> {user.name}',
      '      </main>',
      '    )',
      '  },',
      '})',
      '',
    ].join('\n'),
  )
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => `${one.code} ${one.message}`),
    [],
  )
})

test('[12-3b] F4005: an `async` arrow handed to `each` in the view of a component', async () => {
  const folder = copyOf(join('F6030', 'pass'), 'F4005-each-in-view')
  writeFileSync(
    join(folder, 'screens', 'tags.tsx'),
    [
      "import { component, each } from 'forjr/ui'",
      '',
      "export const Tags = component('Tags', {",
      "  view: () => <span>{String(each(['a', 'b'], async (one) => one))}</span>,",
      '})',
      '',
    ].join('\n'),
  )
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.where?.definition, /`view` of a component/.test(one.message)]),
    [['F4005', 'Tags', true]],
    findings.map((one) => `${one.code} ${one.message}`).join('\n'),
  )
})

test('[32-7] F6007: a redirect from the address of a screen, a second redirect from one address, and a redirect from the address of a route that states `GET`', async () => {
  const folder = copyOf(join('F6007', 'redirects', 'fail'), 'F6007-redirects-cases')
  const text = readFileSync(join(folder, 'forjr.ts'), 'utf8')
  const { findings } = await checkRules(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.where?.file, one.where?.line]),
    [
      ['F6007', 'forjr.ts', lineWith(text, "from: '/orders/:order'")],
      ['F6007', 'forjr.ts', lineWith(text, "to: '/orders/two'")],
      ['F6007', 'forjr.ts', lineWith(text, "from: '/feed'")],
    ],
    findings.map((one) => `${one.code} ${one.where?.line} ${one.message}`).join('\n'),
  )
  assert.match(findings[0].message, /orderScreen/)
  assert.match(findings[2].message, /readFeed/)
  const passing = await checkRules(copyOf(join('F6007', 'redirects', 'pass'), 'F6007-redirects-passing'))
  assert.deepEqual(passing.findings, [])
})
