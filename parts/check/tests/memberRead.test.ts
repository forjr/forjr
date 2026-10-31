import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Node } from '../../build/index.ts'
import { tableOfMember, treeOfText, walk } from '../../build/index.ts'
import { heldToProjects } from './copies.ts'

/** The table that each member of a piece of code names as a member of `db` or of `db.system`, in its order. */
function membersIn(code: string): string[] {
  const tree = treeOfText('functions/read.ts', code)
  assert.ok(tree, code)
  const found: string[] = []
  walk(tree, (node: Node) => {
    const table = tableOfMember(node)
    if (table !== undefined) found.push(table)
  })
  return found
}

test('[55-2] tableOfMember answers the table that a member of db or of db.system names, and nothing for any other member', () => {
  assert.deepEqual(membersIn('db.orders.where({}).all()'), ['orders'])
  assert.deepEqual(membersIn('db.system.audit.add({ line: "x" })'), ['audit'])
  assert.deepEqual(membersIn('o.db.notes.first()'), ['notes'])
  assert.deepEqual(membersIn('mail.send({}); orders.where({}); db[name].all()'), [])
})

test('[55-2] F3005 gives on its projects what it gave before, reading a member of db through tableOfMember', async () => {
  const { findings } = await heldToProjects('F3005')
  assert.deepEqual(
    findings.map((one) => `${one.code} ${one.where?.definition}`),
    ['F3005 audit'],
  )
  const rule = readFileSync(join(import.meta.dirname, '..', 'rules', 'F3005.ts'), 'utf8')
  assert.match(rule, /\btableOfMember\b/)
})
