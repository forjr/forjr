import assert from 'node:assert/strict'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Description } from '../../core/internal.ts'
import { mapOf } from '../../core/internal.ts'
import { linesOf } from '../../build/index.ts'
import { boxTexts } from '../tools/map.ts'

const root = join(import.meta.dirname, '..', '..', '..')

test('[55-10] the text of a workspace in its box is read only from the files of its project: a place that climbs out of it or that no path may name stands with no line, and the map is still made', (t) => {
  const folder = join(root, 'results', 'workspaces', 'map-texts')
  rmSync(folder, { recursive: true, force: true })
  t.after(() => rmSync(folder, { recursive: true, force: true }))
  const project = join(folder, 'project')
  mkdirSync(join(project, 'tables'), { recursive: true })
  writeFileSync(join(project, 'tables', 'memos.ts'), "export const memos = table('memos', {})\n")
  writeFileSync(join(folder, 'outside.ts'), "export const secret = 'outside'\n")
  const description: Description = Object({
    format: 'forjr.description/2',
    app: { name: 'box', needsEngine: '1.0' },
    project: {},
    tables: { memos: { columns: {} } },
    functions: { outside: { kind: 'query', form: 'code' }, colon: { kind: 'query', form: 'code' } },
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
    places: {
      memos: { file: 'tables/memos.ts', from: 0, to: 39 },
      outside: { file: '../outside.ts', from: 0, to: 10 },
      colon: { file: 'C:/outside.ts', from: 0, to: 10 },
    },
  })
  const texts = boxTexts(project, description)
  assert.deepEqual(Object.keys(texts), ['tables/memos.ts'])
  const at = linesOf(description, texts)
  assert.deepEqual(Object.keys(at), ['memos'])
  assert.equal(at.memos.line, 1)
  const map = mapOf({ description, at, box: true, size: 'all' })
  assert.deepEqual(map.lines.map((one) => one.name).sort(), ['colon', 'memos', 'outside'])
  assert.equal(map.lines.find((one) => one.name === 'outside')?.line, undefined)
})
