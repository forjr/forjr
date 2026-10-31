import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkRules } from '../ours.ts'
import { copyOf } from './copies.ts'
import { writeFileSync } from 'node:fs'

/** The findings of F3009 on a copy of a project of the rent app, as `name:code`. */
async function found(side: 'pass' | 'fail'): Promise<string[]> {
  const folder = copyOf(join('rentApp', side), `F3009-rent-${side}`)
  return (await checkRules(folder, {})).findings
    .filter((one) => one.code === 'F3009')
    .map((one) => `${one.where?.definition}:${one.code}`)
}

test('[15-1@9a] F3009: a change open to a caller that states system and changes a row named by its input, of a table whose rules would not let that caller change it, with no check of the caller against the row, is found also where the table has no rule of its own and where the change is open to a role', async () => {
  // The rent app, with the two checks by hand taken out: a renter may tell of any rent, a landlord mark any.
  assert.deepEqual((await found('fail')).sort(), ['markRent:F3009', 'tellPaid:F3009'])
  // With them in: a read of the row through the rules of the table, and a read of the home of the rent.
  assert.deepEqual(await found('pass'), [])
})

// Each holds a project that a rule of the safety must find, as the row of the rule names it: a rule that lets it
// pass fails the test.

const head = `import { boolean, caller, change, input, link, list, table, text } from 'forjr'

export const users = table('users', { columns: { name: text(), roles: list(text()) }, access: { read: 'signedIn' } })

export const orders = table('orders', {
  columns: { title: text(), placedBy: link('users'), paid: boolean({ default: false }) },
  owner: 'placedBy',
  access: { read: 'owner', add: 'signedIn', change: 'owner' },
})
`

// Each is a change that anyone signed in may call, that states \`system\`, and that writes any row of a table whose
// rule is 'owner', with no check on the owner.
const open: Record<string, string> = {
  'it writes the owner column itself, and so hands any order to its caller': `
export const takeOrder = change('takeOrder', {
  access: 'signedIn',
  system: 'an order is handed to whoever asks for it',
  input: { order: link('orders') },
  set: orders.change(input('order'), { placedBy: caller('id') }),
})
`,
  'its code names the owner column in a comment alone': `
export const takeOrder = change('takeOrder', {
  access: 'signedIn',
  system: 'an order is marked paid when its payment arrives',
  input: { order: link('orders') },
  run: ({ db, input: given }) => {
    // placedBy is not looked at here.
    db.system.orders.change(given.order, { paid: true })
  },
})
`,
  'its code reaches db.system by another name': `
export const takeOrder = change('takeOrder', {
  access: 'signedIn',
  system: 'an order is marked paid when its payment arrives',
  input: { order: link('orders') },
  run: ({ db, input: given }) => {
    const all = db.system
    all.orders.change(given.order, { paid: true })
  },
})
`,
}

for (const [what, written] of Object.entries(open))
  test(`[15-1@4] F3009: a change that anyone signed in may call, that states system and writes a table whose rule is 'owner' with no check on the owner, is found where ${what}`, async () => {
    const folder = copyOf(join('F3009', 'pass'), `F3009-case-${Object.keys(open).indexOf(what)}`)
    writeFileSync(join(folder, 'functions', 'notes.ts'), `${head}${written}`)
    const { findings } = await checkRules(folder)
    assert.deepEqual(
      findings.map((one) => `${one.code} ${one.where?.definition ?? ''}`),
      ['F3009 takeOrder'],
    )
  })
