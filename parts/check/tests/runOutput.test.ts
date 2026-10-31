import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { test } from 'node:test'
import type { Finding } from '../../core/index.ts'
import { checkRules } from '../ours.ts'
import { list } from '../rules/list.ts'
import { copyOf } from './copies.ts'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'

async function checked(rule: string, side: 'pass' | 'fail'): Promise<Finding[]> {
  const folder = copyOf(join(rule, side), `${rule.replace('/', '-')}-${side}`)
  return (await checkRules(folder)).findings
}

test('[15-1] F7009 holds a query written with `run` that answers a record, and a change written with `run` that answers one, each stating no `output`, at its line', async () => {
  assert.ok(list.some((one) => one.name === 'F7009/run'))
  assert.deepEqual(await checked('F7009/run', 'pass'), [])
  const findings = await checked('F7009/run', 'fail')
  assert.deepEqual(
    findings.map((one) => [one.code, one.level, one.where?.file, one.where?.line]),
    [
      ['F7009', 'error', 'functions/orders.ts', 5],
      ['F7009', 'error', 'functions/orders.ts', 14],
      ['F7009', 'error', 'functions/orders.ts', 20],
    ],
  )
  assert.match(findings[0].message, /`output`/)
  assert.match(findings[0].fix ?? '', /`output`/)
  assert.equal(findings[0].docs, 'forjr docs F7009')
})

// A change written with `run` that answers a record and states no `output`.
const orders = `import { change, number, table, text } from 'forjr'

export const orders = table('orders', { columns: { status: text(), total: number() } })

export const addOrder = change('addOrder', {
  access: 'signedIn',
  input: { total: number() },
  run: ({ db, input }) => {
    const made = db.orders.add({ status: 'open', total: input.total })
    return { id: made.id, status: made.status }
  },
})
`

/** Takes a name and the files of a project beside `functions/orders.ts`. Writes the project, and answers its folder. */
function projectWith(name: string, files: Record<string, string>): string {
  const folder = join(import.meta.dirname, '..', '..', '..', 'results', 'check', `output-${name}`)
  rmSync(folder, { recursive: true, force: true })
  const all: Record<string, string> = {
    'forjr.ts': "import { project } from 'forjr'\n\nexport const shop = project('shop', { title: 'Shop' })\n",
    'functions/orders.ts': orders,
    ...files,
  }
  for (const [path, text] of Object.entries(all)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), text)
  }
  return folder
}

/** A screen whose view uses `useCall(addOrder)` as `pay`, with the body of the view after it. */
const screenWith = (view: string): Record<string, string> => ({
  'screens/pay.tsx': `import { screen, useCall } from 'forjr/ui'
import { addOrder } from '../functions/orders'

export const payScreen = screen('payScreen', {
  path: '/pay',
  access: 'signedIn',
  view: () => {
    const pay = useCall(addOrder)
${view}
  },
})
`,
})

/** An action whose `run` holds these lines, which call `addOrder`. */
const actionWith = (lines: string): Record<string, string> => ({
  'functions/shop.ts': `import { action } from 'forjr'
import { addOrder } from './orders'

export const orderMany = action('orderMany', {
  access: 'signedIn',
  input: {},
  run: async () => {
${lines}
  },
})
`,
})

/** Whether the check finds F7009 at the change of a project. */
const foundAtChange = async (folder: string): Promise<boolean> =>
  (await checkRules(folder)).findings.some((one) => one.code === 'F7009' && one.where?.file === 'functions/orders.ts')

// `hook.useCall` reads the answer as `await pay.call(input)` and as `pay.value`: both take what the change answers.
const taking = {
  // The one form the check finds today, which holds that the project is read.
  'value-destructured': screenWith(`    const { value } = useCall(addOrder)
    console.log(pay.busy)
    return <p>{String(Object(value).id)}</p>`),
  'call-awaited': screenWith(`    const press = async () => {
      const order = await pay.call({ total: 1 })
      console.log('paid', order)
    }
    return <button type="button" onClick={press}>Pay</button>`),
  'value-read': screenWith(`    return (
      <div>
        <button type="button" onClick={() => pay.call({ total: 1 })}>Pay</button>
        <p>{String(Object(pay.value).id)}</p>
      </div>
    )`),
}

// Calls of the change whose answers no code takes: each is a statement of its own.
const leaving = {
  'all-awaited': actionWith('    await Promise.all([1, 2].map((total) => addOrder({ total })))'),
  'for-each': actionWith('    ;[3, 4].forEach((total) => addOrder({ total }))'),
}

test('[15-1] F7009 holds a change written with `run` and no `output` whose answer a view takes from `useCall`, as `hook.useCall` reads it: by `await pay.call(...)` and by `pay.value`', async () => {
  const missed: string[] = []
  for (const [name, files] of Object.entries(taking))
    if (!(await foundAtChange(projectWith(name, files)))) missed.push(name)
  assert.deepEqual(missed, [])
})

test('[15-1] F7009 passes a change written with `run` and no `output` whose answer no code takes: calls of it in `Promise.all` and `forEach` that are statements of their own', async () => {
  const found: string[] = []
  for (const [name, files] of Object.entries(leaving))
    if (await foundAtChange(projectWith(name, files))) found.push(name)
  assert.deepEqual(found, [])
})
