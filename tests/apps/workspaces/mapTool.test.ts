import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Caller } from '../../../parts/core/index.ts'
import { mapText } from '../../../parts/core/internal.ts'
import { apartRoom } from '../../../parts/engine/index.ts'
import { folderOf, held, identify, product } from '../../../parts/workspaces/tests/held.ts'
import { testSandbox } from '../../../parts/workspaces/tests/sandbox.ts'
import { toolTemplates, tooled } from '../../../parts/workspaces/tests/tooled.ts'

interface Line {
  name: string
  kind: string
  out: { kind: string; name: string; by: string }[]
}

test('[55-10] the project tool map gives the lines to any policy that names it, with no bytes, and the text of a definition only where read shows its file', async (t) => {
  const { tool } = await tooled(t)
  const map = Object(await tool('map', {}, 'mapReader'))
  assert.equal(map.page, 'none')
  assert.equal(map.box, false)
  const names = map.lines.map((one: Line) => one.name)
  for (const name of ['notes', 'addNote', 'allNotes']) assert.ok(names.includes(name), name)
  assert.equal(
    map.lines.some((one: { browser?: object }) => one.browser !== undefined),
    false,
  )
  // `read: ['table']` shows the file of the tables, and not the file of the functions.
  const shown = Object(await tool('map', { name: 'notes' }, 'mapReader'))
  assert.match(shown.text, /^export const notes = table\('notes', \{/)
  const held = Object(await tool('map', { name: 'addNote' }, 'mapReader'))
  assert.equal(held.text, 'not shown')
  assert.equal(held.line.name, 'addNote')
  // A policy that reads every file is shown the text.
  assert.match(Object(await tool('map', { name: 'addNote' })).text, /^export const addNote = change\('addNote', \{/)
})

test('[55-10] a map of a workspace in its box holds no edge seen in its code, and says so on its first line', async (t) => {
  const sandbox = testSandbox(t)
  const at = await held(
    t,
    { sandbox, room: (o) => apartRoom(o), identify, templates: toolTemplates },
    await product(t, folderOf(t), 'builder'),
  )
  const [row] = Object(
    await at.app.write([{ add: 'users', values: { email: 'bo@example.com', roles: [] } }], { as: 'system' }),
  )
  const owner = String(Object(row).id)
  const caller: Caller = { kind: 'user', user: { id: owner, roles: [] } }
  const made = await at.workspaces.create({ owner, from: 'notes' })
  await at.workspaces.run(made.id)
  const map = Object(await at.workspaces.tool(made.id, 'map', {}, { caller, agent: 'builder' }))
  assert.equal(map.box, true)
  assert.equal(map.page, 'none')
  assert.match(mapText(map).split('\n')[0], / {2}no page bytes {2}.*in its box: nothing seen in the code$/)
  const lines: Line[] = map.lines
  assert.ok(lines.some((one) => one.name === 'addNote'))
  // The calls of a view, which the build in the box wrote into the description, stay; nothing else is seen.
  for (const one of lines)
    for (const edge of one.out)
      if (edge.by === 'seen')
        assert.ok(['screen', 'component'].includes(one.kind) && edge.kind === 'calls', `${one.name}`)
  const text = Object(await at.workspaces.tool(made.id, 'map', { name: 'addNote' }, { caller, agent: 'builder' }))
  assert.match(text.text, /^export const addNote = change\('addNote', \{/)
})
