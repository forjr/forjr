import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Description } from '../../core/internal.ts'
import { mapOf } from '../../core/internal.ts'
import { impactOf } from '../index.ts'

/** A description of one table and two functions, with the rules it is handed. */
const described = (rules: { read: object; open: object; list: object }): Description =>
  Object({
    format: 'forjr.description/2',
    app: { name: 'shop', needsEngine: '1.0' },
    project: {},
    tables: { memos: { columns: { body: { kind: 'text' } }, access: { read: rules.read } } },
    functions: {
      openNotes: { kind: 'query', form: 'plain', access: rules.open, plan: { from: 'memos' }, reads: ['memos'] },
      listNotes: { kind: 'query', form: 'plain', access: rules.list, plan: { from: 'memos' }, reads: ['memos'] },
    },
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
    places: {},
  })

test('[55-4b] the map and the impact say the rules of one project with the same words', () => {
  const staff = { rule: 'role', role: 'staff' }
  const live = described({ read: staff, open: staff, list: staff })
  const next = described({
    read: { rule: 'anyone', why: 'notes are public' },
    open: { rule: 'signedIn' },
    list: { rule: 'where', filter: { col: 'body', is: 'x' } },
  })
  const map = mapOf({ description: next, size: 'all' })
  const ruleOf = (name: string): string => String(map.lines.find((one) => one.name === name)?.rule)
  const impact = impactOf({ against: 'live', live, next })
  const said = (name: string): string => String(impact.rights.find((one) => one.name === name)?.change)
  assert.equal(said('openNotes'), `now callable by ${ruleOf('openNotes')}`)
  assert.equal(ruleOf('openNotes'), 'anyone signed in')
  assert.equal(said('memos'), `now readable by ${ruleOf('memos').replace(/^read /, '')}`)
  assert.equal(ruleOf('memos'), 'read anyone (why: notes are public)')
})
