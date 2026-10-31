import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Source } from '../index.ts'
import { describeProject, linesOf, seenInCode } from '../index.ts'
import { copyOf, errorsOf } from './projects.ts'

const nothing = { reads: [], writes: [], sets: [], calls: [], starts: [], emits: [] }

test('[55-2] seenInCode holds what the code of each code function, flow, route, command and backfill reads, writes, sets, calls, starts and emits', async () => {
  const { description, findings, source } = await describeProject(copyOf('seenCode', 'seen-in-code'))
  assert.deepEqual(errorsOf(findings), [])
  const seen = seenInCode(description, source)
  // A member of `db` and of `db.system` reads its table, and a chain that adds, changes or removes writes it, with
  // the columns of values written in place; an imported function is called, a member of an agent by its owner's
  // name and its own, `start` starts a flow, and `emit` with a name written as text emits it.
  assert.deepEqual(seen.markPaid, {
    reads: ['audit', 'orders'],
    writes: ['audit', 'orders'],
    sets: ['audit.line', 'orders.note', 'orders.status'],
    calls: ['helper.approve', 'notify'],
    starts: ['ship'],
    emits: ['paid'],
  })
  assert.deepEqual(seen.ship, { ...nothing, reads: ['audit'], writes: ['audit'], sets: ['audit.line'] })
  assert.deepEqual(seen.feed, { ...nothing, reads: ['orders'] })
  assert.deepEqual(seen.report, { ...nothing, calls: ['addOrder'] })
  assert.deepEqual(seen.stamp, { ...nothing, reads: ['orders'], writes: ['orders'], sets: ['orders.note'] })
  // A call through a helper of the file, a table named by a name worked out, and an emit by a name worked out.
  assert.deepEqual(seen.sweep, nothing)
  // A plain function is no code, and a screen, a component and a `python` are not walked.
  for (const name of ['addOrder', 'churn', 'homeScreen']) assert.equal(Object.hasOwn(seen, name), false, name)
})

test('[55-2] seenInCode answers each list in the order of its names, each name once, and one source gives one record', async () => {
  const { description, source } = await describeProject(copyOf('seenCode', 'seen-in-code-order'))
  const seen = seenInCode(description, source)
  for (const [name, one] of Object.entries(seen))
    for (const list of Object.values(one)) assert.deepEqual(list, [...new Set(list)].sort(), name)
  assert.deepEqual(seenInCode(description, source), seen)
})

test('[55-2] linesOf gives one line for a definition in a file with \\r\\n line endings and in the same file with \\n', async () => {
  const { description, source } = await describeProject(copyOf('seenCode', 'seen-in-code-lines'))
  const lf = linesOf(description, source)
  // The same files, written with two characters at each line ending, and read with no tree.
  const crlf: Source = Object.fromEntries(
    Object.entries(source).map(([path, file]) => [path, { file: file.file, text: file.text.replace(/\n/g, '\r\n') }]),
  )
  const lines = linesOf(description, crlf)
  assert.deepEqual(Object.keys(lines).sort(), Object.keys(lf).sort())
  for (const [name, at] of Object.entries(lf)) {
    assert.deepEqual([lines[name].file, lines[name].line, lines[name].last], [at.file, at.line, at.last], name)
    assert.equal(lines[name].text.replace(/\r\n/g, '\n'), at.text, name)
  }
  // The line of the first character of the definition and of its last, and its text between the two.
  const text = source['functions/orders.ts'].text.split('\n')
  const markPaid = lf.markPaid
  assert.equal(markPaid.file, 'functions/orders.ts')
  assert.match(text[markPaid.line - 1], /^export const markPaid = change\('markPaid', \{$/)
  assert.equal(text[markPaid.last - 1], '})')
  assert.match(markPaid.text, /^export const markPaid = change\('markPaid', \{\n {2}access: 'signedIn',/)
  assert.match(markPaid.text, /return found\n {2}\},\n\}\)$/)
})
