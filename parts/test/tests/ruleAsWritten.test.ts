import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ruleAsWritten } from '../declared.ts'

test('[55-4a] ruleAsWritten writes a rule as its code writes it, so that a line of a test is found in its file', () => {
  assert.equal(ruleAsWritten({ rule: 'role', role: 'staff' }), "role('staff')")
  assert.equal(ruleAsWritten({ rule: 'signedIn' }), 'signedIn')
  assert.equal(ruleAsWritten({ rule: 'anyone', why: 'a form' }), 'anyone')
  assert.equal(ruleAsWritten({ rule: 'where', filter: { col: 'a', is: 1 } }), 'a rule written as code')
  assert.equal(ruleAsWritten({ rule: 'allow', module: 'server/a.js', export: 'a_access' }), 'a rule written as code')
  assert.equal(ruleAsWritten(undefined), 'no rule')
})
