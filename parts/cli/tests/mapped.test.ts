import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { root, typed } from './typed.ts'

// A project with three packages of its own, laid in its `node_modules/` as an install lays them: one that draws in a
// screen, one that both a screen and a function use, and one that a function reaches the network with.
const files: Record<string, string> = {
  'forjr.ts': `import { project } from 'forjr'

export const mapped = project('mapped', { title: 'Mapped' })
`,
  'functions/sales.ts': `import { action, anyone, change, input, number, query, table, text } from 'forjr'
import { monthName } from 'month-words'
import { fetchJson } from 'net-reader'

const open = anyone('the sales are shown to every visitor')

export const sales = table('sales', {
  columns: { month: number(), amount: number() },
  access: { read: open, add: open },
})

export const allSales = query('allSales', { access: open, rows: sales.oldest('createdAt').limit(12) })

export const addSale = change('addSale', {
  access: open,
  input: { month: number(), amount: number() },
  set: sales.add({ month: input('month'), amount: input('amount') }),
})

export const saleWords = action('saleWords', {
  access: open,
  input: { month: number() },
  output: text(),
  run: async ({ input }) => \`\${monthName(input.month)} \${JSON.stringify(await fetchJson('http://127.0.0.1:9/'))}\`,
})
`,
  'screens/home.tsx': `import { read, screen, Form } from 'forjr/ui'
import { BarLine } from 'tiny-bars'
import { monthName } from 'month-words'
import { addSale, allSales } from '../functions/sales'

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'anyone',
  data: { sales: read(allSales) },
  view: ({ sales }) => (
    <main>
      {sales.map((one) => (
        <BarLine key={one.id} label={monthName(one.month)} value={one.amount} />
      ))}
      <Form call={addSale} with={{ month: 1, amount: 10 }}><button type="submit">
        Add
      </button></Form>
    </main>
  ),
})
`,
  'node_modules/tiny-bars/package.json': JSON.stringify({
    name: 'tiny-bars',
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  }),
  'node_modules/tiny-bars/index.js': `import { createElement } from 'react'

// A bar of a chart, long enough that its bytes are told apart from those of the other packages.
export function BarLine({ label, value }) {
  return createElement('div', { className: 'bar' }, label, ' ', createElement('span', { style: { width: value } }))
}
`,
  'node_modules/month-words/package.json': JSON.stringify({
    name: 'month-words',
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  }),
  'node_modules/month-words/index.js': `const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function monthName(month) {
  return names[(month - 1) % 12] ?? 'none'
}
`,
  'node_modules/net-reader/package.json': JSON.stringify({
    name: 'net-reader',
    version: '1.0.0',
    type: 'module',
    exports: './index.js',
  }),
  'node_modules/net-reader/index.js': `import { request } from 'node:http'

export function fetchJson(address) {
  return new Promise((done) => {
    const asked = request(address, (answer) => done(answer.statusCode))
    asked.on('error', () => done(0))
    asked.end()
  })
}
`,
}

/** Lays the project into an empty folder of the test under `results/`, removed when the test ends. */
function laid(t: TestContext): string {
  const folder = join(root, 'results', 'cli', 'mapped')
  const remove = (): void => rmSync(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  remove()
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
  t.after(remove)
  return folder
}

test('[43-4] the map lists each package the project imports, with where it is used, whether it reaches the browser, its bytes in the page and its ways out; and each screen with its address, its access, its queries, its calls and the packages it imports', async (t) => {
  const folder = laid(t)
  const map = await typed(folder, 'map')
  assert.equal(map.ended, 0, map.printed)
  const lines = map.printed.split('\n')
  const line = (start: string): string => {
    const found = lines.find((one) => one.startsWith(`${start}  `) || one === start)
    assert.ok(found, `the map has ${start}:\n${map.printed}`)
    return found
  }
  // Where each is used, whether it reaches the browser with its bytes in the page, and its ways out.
  assert.match(line('package tiny-bars'), / {2}browser \d+ bytes(?: |$)/)
  assert.match(line('package tiny-bars'), / {2}imported by homeScreen(?: |$)/)
  assert.doesNotMatch(line('package tiny-bars'), /reaches/)
  assert.match(line('package month-words'), / {2}browser \d+ bytes(?: |$)/)
  assert.match(line('package month-words'), / {2}imported by homeScreen(?: |$)/)
  assert.match(line('package month-words'), / {2}files functions\/sales\.ts(?: |$)/)
  assert.match(line('package net-reader'), / {2}files functions\/sales\.ts(?: |$)/)
  assert.match(line('package net-reader'), / {2}reaches net(?: |$)/)
  assert.doesNotMatch(line('package net-reader'), /browser/)
  const bytes = (name: string): number => Number(/ {2}browser (\d+) bytes/.exec(line(`package ${name}`))?.[1])
  assert.ok(bytes('tiny-bars') > 0 && bytes('month-words') > 0)
  assert.notEqual(bytes('tiny-bars'), bytes('month-words'))

  // The screen: its access and address, the query of its data, the change it calls, the packages it imports.
  const home = line('screen homeScreen')
  for (const field of ['anyone', '/', 'asks allSales', 'calls ~addSale'])
    assert.ok(home.split('  ').includes(field), `${field}: ${home}`)
  const imports = home.split('  ').find((one) => one.startsWith('imports '))
  assert.deepEqual(imports?.slice('imports '.length).split(', ').sort(), ['month-words', 'tiny-bars'])

  // The same with --json, as data.
  const json = await typed(folder, 'map', '--json')
  assert.equal(json.ended, 0, json.printed)
  const value = Object(json.answer.value)
  const of = (kind: string, name: string) =>
    value.lines.find((one: { kind: string; name: string }) => one.kind === kind && one.name === name)
  assert.equal(of('package', 'tiny-bars')?.browser?.bytes, bytes('tiny-bars'))
  assert.deepEqual(of('package', 'net-reader')?.reaches, ['net'])
  assert.equal(of('package', 'net-reader')?.browser, undefined)
  assert.deepEqual(of('package', 'month-words')?.files, ['functions/sales.ts'])
  assert.equal(of('screen', 'homeScreen')?.rule, 'anyone')
  assert.deepEqual(
    of('screen', 'homeScreen')
      ?.out.filter((one: { kind: string }) => one.kind === 'imports')
      .map((one: { name: string }) => one.name)
      .sort(),
    ['month-words', 'tiny-bars'],
  )
})

test('[43-4] the map gives the bytes in the page of each file of a screen and of the style files every page loads, and forjr build tells the bytes in the page of each package of the project', async (t) => {
  const folder = laid(t)
  const built = await typed(folder, 'build', '--json')
  assert.equal(built.ended, 0, built.printed)
  const value: unknown = Object(built.answer).value
  const bundle = String(Object(value).bundle)
  const description: unknown = JSON.parse(readFileSync(join(bundle, 'description.json'), 'utf8'))
  const browser = Object(Object(description).browser)

  // The map of the one screen: a line for each file a page loads for it, with the bytes of that file in the bundle.
  const map = await typed(folder, 'map', 'homeScreen')
  assert.equal(map.ended, 0, map.printed)
  const lines = map.printed.split('\n')
  const homeFiles: string[] = Object(browser.screens).homeScreen
  assert.ok(homeFiles.length > 0)
  for (const file of homeFiles)
    assert.ok(lines.includes(`browser ${file} ${statSync(join(bundle, file)).size} bytes`), map.printed)
  // No style file is shared by several screens: the first line of the map names none.
  assert.equal(browser.styles, undefined)
  assert.doesNotMatch((await typed(folder, 'map')).printed.split('\n')[0], /browser styles/)

  // The build tells what each package of the project weighs in the page, and nothing of one that reaches no browser.
  const packages = Object(Object(description).packages)
  assert.deepEqual(Object(value).packages, {
    'month-words': packages['month-words'].bytes,
    'tiny-bars': packages['tiny-bars'].bytes,
  })
  const told = await typed(folder, 'build')
  assert.equal(told.ended, 0, told.printed)
  assert.match(told.printed, new RegExp(`tiny-bars: ${packages['tiny-bars'].bytes} bytes in the page`))
  assert.match(told.printed, new RegExp(`month-words: ${packages['month-words'].bytes} bytes in the page`))
  assert.doesNotMatch(told.printed, /net-reader/)
})
