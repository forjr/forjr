import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Finding } from '../../core/index.ts'
import { checkProject } from '../index.ts'
import { checkRules } from '../ours.ts'
import { copyOf, heldToProjects, lineWith } from './copies.ts'

const file = 'screens/orders.tsx'

// Each screen rule of these tests, with every mistake of its failing project: a piece of the line it stands on, and
// what the sentence of its finding says.
const rules: Record<string, [piece: string, says: RegExp][]> = {
  F6007: [
    ['againScreen', /ordersScreen.*\/orders/],
    ['namedScreen', /orderScreen.*\/orders\/:id/],
  ],
  F6008: [
    ['const rows = openOrders(', /openOrders/],
    ["addOrder({ name: 'A lamp'", /addOrder/],
  ],
  F6009: [
    ['<input name="name" />', /`name`.*`with`/],
    ['name="totl"', /`totl`.*name, total, status, note, address, tags/],
    ['name="address.street"', /`address\.street`/],
    ['values={{ nope: 1 }}', /`values`.*`nope`/],
    ["reset={['gone']}", /`reset`.*`gone`/],
    ['nope: 2', /`nope`.*`orderScreen`/],
    ["useField('nope')", /`nope`.*name, total, status, note, address, tags/],
    ["useField('gone')", /`gone`.*name, total, status, note, address, tags/],
  ],
  F6018: [
    ['state: { open: boolean() }', /server alone/],
    ['<Form call={addOrder}>', /server alone/],
    ['<Link set=', /server alone/],
    ['onClick=', /server alone/],
    ['useState(0)', /server alone/],
    ["export const other = 'more'", /server alone/],
  ],
  F6021: [
    ['digits: 0 })', /currency/],
    ["format(o.total, 'currency')", /currency/],
  ],
  F6022: [
    ['<Filters />', /`Filters`.*`q`/],
    ['<Filters id={`more', /`Filters`.*`q`/],
  ],
  F6023: [
    ['rows: read(orders)', /`rows`.*neither a query nor an action/],
    ['added: read(addOrder', /`added`.*neither a query nor an action/],
    ['quick: read(', /`quick`.*`wait: false`/],
    ['again: read(', /`again`.*`refresh`/],
    ['found: read(', /`found`.*`needed`/],
  ],
}

/** What these rules found, among whatever the other rules find. */
const ours = (findings: Finding[]): Finding[] => findings.filter((one) => Object.hasOwn(rules, one.code))

test('[15-1@5] [30-7] every screen rule has a passing project and a failing project, and the failing one gives exactly its code, once for each mistake, on its line', async () => {
  for (const [code, cases] of Object.entries(rules)) {
    const { findings: failing, folder } = await heldToProjects(code)
    const text = readFileSync(join(folder, file), 'utf8')
    const lines = cases.map(([piece]) => lineWith(text, piece))
    assert.ok(!lines.includes(0), `every piece of ${code} is a line of its file`)
    const found = failing.map((one) => `${one.where?.line}: ${one.message}`).join('\n')
    assert.deepEqual(failing.map((one) => one.where?.line).sort(), [...lines].sort(), `${code}:\n${found}`)
    for (const [k, [piece, says]] of cases.entries())
      assert.ok(
        failing.some((one) => one.where?.line === lines[k] && says.test(one.message)),
        `${code}, at ${piece}, says ${says}:\n${found}`,
      )
    for (const one of failing) {
      assert.equal(one.where?.file, file, code)
      assert.ok(one.where?.definition, `a finding of ${code} names its definition`)
      assert.ok(one.message.length > 10 && one.fix, code)
      assert.equal(one.docs, `forjr docs ${code}`)
      assert.equal(one.level, 'error', code)
    }
  }
})

test('[15-1@5] [30-7] the passing project of every screen rule passes the type checker too', async () => {
  for (const code of Object.keys(rules)) {
    const made = await checkProject(copyOf(join(code, 'pass'), `${code}-pass-typed`))
    assert.deepEqual(
      made.findings.map((one) => `${one.code} ${one.where?.file}:${one.where?.line} ${one.message}`),
      [],
      `the passing project of ${code}`,
    )
  }
})

test('[30-7] each row of what the check holds a screen to, of those that these tests hold, is reported with its own code', async () => {
  // One project with a mistake of each row: every code is found, and no mistake hides another.
  const folder = copyOf(join('F6022', 'pass'), 'rows-of-the-check')
  writeFileSync(
    join(folder, 'forjr.ts'),
    "import { project } from 'forjr'\n\nexport const shop = project('shop', {})\n",
  )
  writeFileSync(
    join(folder, file),
    [
      "import { component, screen, text, useTranslations, Form, Link } from 'forjr/ui'",
      "import { addOrder } from '../functions/orders'",
      '',
      "export const Filters = component('Filters', {",
      "  state: { q: { type: text({ default: '' }), in: 'address' } },",
      '  view: () => null,',
      '})',
      '',
      "export const ordersScreen = screen('ordersScreen', {",
      "  path: '/orders',",
      "  access: 'signedIn',",
      '  view: () => {',
      '    const { format } = useTranslations()',
      '    return (',
      "      <Form call={addOrder} with={{ name: 'A lamp' }}>",
      '        <input name="name" />',
      '        <Link set={{ nope: true }}>Nope</Link>',
      '        <Link to="//evil.example/">Away</Link>',
      "        <span>{format(1, 'currency')}</span>",
      '        <Filters />',
      '      </Form>',
      '    )',
      '  },',
      '})',
      '',
    ].join('\n'),
  )
  const found = (await checkRules(folder)).findings.filter((one) => one.code.startsWith('F60'))
  assert.deepEqual(found.map((one) => `${one.code}:${one.where?.line}`).sort(), [
    'F6009:16',
    'F6011:17',
    'F6013:18',
    'F6021:19',
    'F6022:20',
  ])
})

test('[31-1b] a direct call in a screen file is F6008, in a view and in a press, and a call through read, useQuery, useCall or call= is none', async () => {
  const made = await checkRules(copyOf(join('F6008', 'fail'), 'F6008-direct'))
  const found = ours(made.findings)
  assert.deepEqual(
    found.map((one) => [one.code, one.where?.definition]),
    [
      ['F6008', 'ordersScreen'],
      ['F6008', 'ordersScreen'],
    ],
  )
  assert.match(found[0].message, /`openOrders`/)
  assert.match(found[0].fix ?? '', /read|useQuery/)
  assert.match(found[1].fix ?? '', /useCall|call=/)
  assert.deepEqual(ours((await checkRules(copyOf(join('F6008', 'pass'), 'F6008-through'))).findings), [])
})

test('[31-18] each case of F6023 is reported: an entry that reads a table, wait: false on a query that answers at once, refresh on a query, needed in a component', async () => {
  const folder = copyOf(join('F6023', 'fail'), 'F6023-cases')
  const text = readFileSync(join(folder, file), 'utf8')
  const found = (await checkRules(folder)).findings
  const at = (piece: string): string[] =>
    found
      .filter((one) => one.where?.line === lineWith(text, piece))
      .map((one) => `${one.code} ${one.where?.definition}`)
  assert.deepEqual(at('rows: read(orders)'), ['F6023 ordersScreen'])
  assert.deepEqual(at('quick: read('), ['F6023 ordersScreen'])
  assert.deepEqual(at('again: read('), ['F6023 ordersScreen'])
  assert.deepEqual(at('found: read('), ['F6023 Count'])
  // A heavy query may be left for the page, an action may be read again on a timer, and a screen may need an entry.
  assert.deepEqual((await checkRules(copyOf(join('F6023', 'pass'), 'F6023-allowed'))).findings, [])
})

test('[14-7] a screen whose data and title hold our words alone is stored with them, one call inside an arrow makes that arrow code, and the check names the call; every view is code', async () => {
  const made = await checkProject(copyOf('screenArrows', 'screenArrows'))
  assert.deepEqual(
    made.findings.map((one) => `${one.code} ${one.where?.line} ${one.message}`),
    [],
  )
  for (const name of ['readScreen', 'callScreen']) assert.equal(made.forms[name], 'code', name)
  assert.equal(made.why.readScreen, undefined)
  const text = readFileSync(join('parts', 'check', 'tests', 'screenArrows', 'screens', 'views.tsx'), 'utf8')
  assert.equal(
    made.why.callScreen,
    `title: a call of \`String\`, a name that the arrow does not hold, on line ${lineWith(text, 'String(orders.length)')}`,
  )
})

test('[10-4] types flow: a screen that reads a column of a linked row passes the type checker, and a misspelt one fails with the columns of that table beside what the checker says', async () => {
  const passing = await checkProject(copyOf('typesFlow', 'typesFlow-pass'))
  assert.deepEqual(
    passing.findings.map((one) => `${one.code} ${one.where?.file}:${one.where?.line} ${one.message}`),
    [],
  )
  const folder = copyOf('typesFlow', 'typesFlow-fail')
  const text = readFileSync(join(folder, file), 'utf8')
  writeFileSync(join(folder, file), text.replace('o.customer.name', 'o.customer.nmae'))
  const { findings } = await checkProject(folder)
  assert.deepEqual(
    findings.map((one) => [one.code, one.where?.file, one.where?.line]),
    [['F8000', file, lineWith(text, 'o.customer.name')]],
  )
  // The checker's own sentence stands, and ours follows it with the table and its columns.
  assert.match(findings[0].message, /^TS2339: Property 'nmae' does not exist on type/)
  assert.match(findings[0].message, /The table `customers` has the columns `id`, `createdAt`, `updatedAt` and `name`\./)
})

test('[10-4] an entry that is read with needed holds no nothing in its view, a change in code with no output answers nothing, and a test of the app is held to both by the type checker, as it is to the rows of a table', async () => {
  const folder = copyOf('answers', 'answers')
  const { findings } = await checkProject(folder)
  // Each line that the type checker must refuse is marked in its file, and no other line is refused.
  const marked = (path: string): string[] =>
    readFileSync(join(folder, path), 'utf8')
      .replace(/\r\n/g, '\n')
      .split('\n')
      .flatMap((line, at) => (line.trimEnd().endsWith('// refused') ? [`F8000 ${path}:${at + 1}`] : []))
  assert.deepEqual(
    [...new Set(findings.map((one) => `${one.code} ${one.where?.file}:${one.where?.line}`))].sort(),
    [...marked('screens/order.tsx'), ...marked('tests/orders.test.ts')].sort(),
    findings.map((one) => `${one.where?.file}:${one.where?.line} ${one.message}`).join('\n'),
  )
  assert.equal(marked('screens/order.tsx').length, 1)
  assert.equal(marked('tests/orders.test.ts').length, 3)
})

// A second failing project for each of these screen rules: the passing project of F6011, with one more screen
// file that makes the mistake in another way than the first failing project does.
const head = [
  "import { screen, read, text, Link } from 'forjr/ui'",
  "import { openOrders } from '../functions/orders'",
  '',
  '',
].join('\n')

/** A screen open to anyone, with what the case adds to its options and its view. */
const screenOf = (name: string, more: string, view: string): string =>
  `export const ${name} = screen('${name}', {\n  path: '/${name}',\n  access: 'anyone',\n${more}  view: ${view},\n})\n`

// Each rule: the file of the screen, and the piece of the line that the finding stands on.
const mistakes: Record<string, [text: string, piece: string]> = {
  F6011: [
    screenOf('mineC', "  state: { q: text({ default: '' }) },\n", '() => <Link set={{ q: 5 }}>Five</Link>'),
    'set={{ q: 5 }}',
  ],
  F6012: [
    "export const mineD = screen('mineD', { for: 'error', access: 'signedIn', view: () => <span>Bad</span> })\n",
    "for: 'error'",
  ],
  F6013: [screenOf('mineE', '', "() => <Link to={'/\t/evil.example'}>Away</Link>"), "to={'/"],
  F6015: [
    screenOf(
      'mineF',
      "  cache: '1 minute',\n  data: { orders: read(openOrders) },\n",
      '({ orders }) => <span>{orders.length}</span>',
    ),
    'data: { orders',
  ],
  F6030: [
    screenOf(
      'mineK',
      "  cache: { for: '1 minute', public: true },\n",
      "({ user }) => <span>{user ? user.id : 'none'}</span>",
    ),
    'user ? user.id',
  ],
}

test('[30-2] a failing project for each screen rule held here gives exactly that code, on the line of its mistake', async () => {
  for (const [code, [screen, piece]] of Object.entries(mistakes)) {
    const folder = copyOf(join('F6011', 'pass'), `case-${code}`)
    const file = join(folder, 'screens', 'mine.tsx')
    writeFileSync(file, head + screen)
    const found = (await checkRules(folder)).findings
    const said = found.map((one) => `${one.code} ${one.where?.file}:${one.where?.line} ${one.message}`).join('\n')
    assert.deepEqual(
      found.map((one) => one.code),
      [code],
      `${code}:\n${said}`,
    )
    assert.equal(found[0].where?.file, 'screens/mine.tsx', said)
    // A finding about a whole screen stands on the line of its definition, as the builder reads it.
    const line = lineWith(readFileSync(file, 'utf8'), piece)
    assert.ok([line, lineWith(readFileSync(file, 'utf8'), 'export const')].includes(found[0].where?.line ?? 0), said)
  }
})
