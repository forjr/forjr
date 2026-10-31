import assert from 'node:assert/strict'
import { test } from 'node:test'
import { agentsText } from '../../../parts/docs/index.ts'
import { localTools } from '../../../parts/cli/localTools.ts'
import { copied } from '../../../parts/cli/tests/typed.ts'

test('[55-10] AGENTS.md tells the agent of a new project to run forjr map first, within its 8 kB, and its row of forjr map says what it gives', () => {
  const text = agentsText()
  const [heading, first] = text.split('\n\n')
  assert.equal(heading, '# This project is built with Forjr')
  assert.equal(first, 'Run `forjr map` to see the app, and `forjr map <name>` before you change a definition.')
  assert.ok(new TextEncoder().encode(text).length <= 8192)
  assert.ok(
    text.includes(
      '| `forjr map` | The app in a few hundred tokens: each definition with its file and line, who may call it, what it reads and writes, who uses it and its tests. `forjr map <name>`, `<table>.<column>` or `<file>` for one |',
    ),
  )
})

test('[55-10] forjr_map of forjr mcp says what the map is for, and takes a name for one definition alone', async (t) => {
  const project = copied(t, 'map-mcp', 'mapShop')
  const tool = (await localTools(project)).find((one) => one.name === 'forjr_map')
  assert.ok(tool)
  assert.equal(
    tool.about,
    "The app's map: each definition with its file and line, who may call it, what it reads and writes, who uses it and its tests. Name a definition, a column or a file for that one alone.",
  )
  assert.ok(Object.hasOwn(tool.input, 'name'))
  const answered = Object(await tool.run({ name: 'markPaid' }))
  assert.equal(answered.ok, true, JSON.stringify(answered))
  assert.equal(answered.value.line.name, 'markPaid')
})
