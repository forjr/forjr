import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Finding } from '../../core/index.ts'
import type { Facts } from '../../core/internal.ts'
import { finding } from '../../core/internal.ts'
import { checkRules } from '../ours.ts'
import { list } from '../rules/list.ts'
import { copyOf, heldToProjects, lineWith } from './copies.ts'

// The rules of the data and of the safety, each by the name of its file in the list.
const alone = ['F2005', 'F2006', 'F2007', 'F2008', 'F2009', 'F2010', 'F2011', 'F2012']
const safety = ['F3001', 'F3002', 'F3003', 'F3004/functions', 'F3005', 'F3006', 'F3009']
// The rules that pass on what the data found of a table change: they find nothing where no facts are handed in.
const passedOn = ['F2001', 'F2002', 'F2003', 'F2004']

/** Each finding as the definition it stands at and its code, in the order of the names. */
const found = (findings: Finding[]): string[] =>
  findings.map((one) => `${one.where?.definition ?? ''}:${one.code}`).sort()

/** Holds every finding to its level, its place, its sentence, its fix and its page. */
function whole(findings: Finding[], folder: string): void {
  for (const one of findings) {
    const file = one.where?.file ?? ''
    assert.match(file, /\.ts$/, one.code)
    const lines = readFileSync(join(folder, file), 'utf8').split('\n').length
    assert.ok((one.where?.line ?? 0) > 0 && (one.where?.line ?? 0) <= lines, `${one.code} names a line of ${file}`)
    assert.ok(one.message.length > 10 && one.fix, one.code)
    assert.equal(one.docs, `forjr docs ${one.code}`)
    assert.equal(one.level, one.code === 'F3005' ? 'warning' : 'error', one.code)
  }
}

test('[15-1@4] every rule of the data and of the safety has a passing project and a failing project, and the failing one gives exactly its code', async () => {
  const names = list.map((one) => one.name)
  for (const name of [...passedOn, ...alone, ...safety]) assert.ok(names.includes(name), `the rule ${name} is built`)
  for (const name of [...alone, ...safety]) {
    const { findings, folder } = await heldToProjects(name)
    whole(findings, folder)
  }
})

// What the data says of each table change that it refuses, in its own words, as `factsOf` answers it.
const refused: Record<string, Finding> = {
  F2001: finding('F2001', '1 row of `notes` does not fit what `notes.n` becomes.', {
    fix: 'Change those rows so that they fit, or add a new column, fill it with a change, then remove the old one.',
  }),
  F2002: finding('F2002', 'The column `notes.n` is gone, and `removed` does not name it.', {
    fix: "Name `n` in `removed` of the table, or state `was: ['n']` on the column it became.",
  }),
  F2003: finding('F2003', 'The table `notes` is gone, and `removed` of the project does not name it.', {
    fix: "Name `notes` in `removed` of the project, or state `was: ['notes']` on the table it became.",
  }),
  F2004: finding('F2004', 'The column `notes.n` is gone and `count` is new, with no `was`.', {
    fix: "State `was: ['n']` on the column that is the same one under a new name, or name `n` in `removed` of the table.",
  }),
}

const facts = (...codes: string[]): Facts => ({
  tableFindings: codes.map((code) => refused[code]),
  waitingStepNames: {},
})

test('[15-1@4] a rule that passes F2001 to F2004 on finds nothing alone, and with the facts of a running app exactly its code, at the place of the table', async () => {
  for (const code of passedOn) {
    const passing = copyOf(join(code, 'pass'), `${code}-pass`)
    assert.deepEqual((await checkRules(passing)).findings, [], `the passing project of ${code}`)
    assert.deepEqual((await checkRules(passing, { facts: facts() })).findings, [], `${code}, against data it fits`)

    // The failing project is the same app after a table change that its data does not bear: alone it says nothing.
    const folder = copyOf(join(code, 'fail'), `${code}-fail`)
    assert.deepEqual((await checkRules(folder)).findings, [], `the failing project of ${code}, with no facts`)
    const failing = await checkRules(folder, { facts: facts(code) })
    assert.equal(failing.findings.length, 1, `the failing project of ${code}`)
    const [one] = failing.findings
    assert.deepEqual([one.code, one.message, one.fix], [code, refused[code].message, refused[code].fix])
    whole(failing.findings, folder)
    // A description keeps no file and no line: the rule adds the place of the table, found by its name, and for a
    // table that is gone the place of the project, where `removed` is stated.
    const gone = code === 'F2003'
    const file = gone ? 'forjr.ts' : 'functions/notes.ts'
    const line = lineWith(readFileSync(join(folder, file), 'utf8'), gone ? "project('shop'" : "table('notes'")
    assert.deepEqual(one.where, { file, line, definition: gone ? 'shop' : 'notes' })
  }

  // Each rule passes on the findings of its own code, so four findings that are handed in are told once each.
  const folder = copyOf(join('F2002', 'fail'), 'F2002-all')
  const all = await checkRules(folder, { facts: facts(...passedOn) })
  assert.deepEqual(all.findings.map((one) => one.code).sort(), passedOn)
  // A finding that names a table which the source does not hold, and which is no table that is gone, keeps its words.
  const far = finding('F2001', '3 rows of `elsewhere` do not fit what `elsewhere.n` becomes.', {
    fix: 'Mend the rows.',
  })
  const told = await checkRules(folder, { facts: { tableFindings: [far], waitingStepNames: {} } })
  assert.deepEqual(
    told.findings.map((one) => [one.code, one.message, one.where?.file]),
    [['F2001', far.message, 'forjr.ts']],
  )
})

test('[20-18b] each misuse of a vector column and of near, and both cases of a value of another model, is reported by the check', async () => {
  const folder = copyOf('vectors', 'vectors')
  const made = await checkRules(folder)
  assert.deepEqual(
    found(made.findings),
    [
      // F2008: a declared size that is not the column's, as an input, as a written list, and in a body.
      ...['wrongSize:F2008', 'wrongList:F2008', 'bodyWrongSize:F2008'],
      // F2009: `near` with neither `limit` nor `first()`, written with `rows` and in a body.
      ...['noLimit:F2009', 'bodyNoLimit:F2009'],
      // F2010: a vector column in a filter other than `empty`, in a sort, an index, `unique` and a group.
      ...['filtered:F2010', 'sorted:F2010', 'indexed:F2010', 'uniqued:F2010', 'grouped:F2010', 'bodyFiltered:F2010'],
      // F2010: `near` on a column that is no vector, joined with what it does not join with, inside `in`, and in the filter of a `where` rule.
      // Joined with `search` it is no finding: the two are read in one pass and joined by their ranks.
      ...['notVector:F2010', 'withSort:F2010', 'withCount:F2010', 'withSkip:F2010'],
      ...['bodySorted:F2010', 'insideIn:F2010', 'digests:F2010'],
      // A vector column in `search` is F2006, and one named as `owner` is F2007.
      ...['searched:F2006', 'owned:F2007'],
      // F2012: the value's own type states another model, searched with and written; and the `embed` of another model in a body.
      ...['otherModel:F2012', 'writeOther:F2012', 'bodyOtherModel:F2012', 'bodyWriteOther:F2012', 'embedOther:F2012'],
    ].sort(),
  )
  whole(made.findings, folder)
  const of = (name: string): Finding => {
    const one = made.findings.find((finding) => finding.where?.definition === name)
    assert.ok(one, name)
    return one
  }
  const text = readFileSync(join(folder, 'functions', 'search.ts'), 'utf8')
  assert.equal(of('wrongSize').where?.line, lineWith(text, "query('wrongSize'"))
  assert.match(of('wrongSize').message, /\b3\b.*\b4\b|\b4\b.*\b3\b/)
  assert.match(of('noLimit').fix ?? '', /limit/)
  assert.match(of('insideIn').message, /`in`/)
  assert.match(of('digests').message, /rule/)
  // Both models are named as what they are: the provider and the name, which is what two definitions share.
  for (const name of ['otherModel', 'embedOther', 'writeOther']) {
    assert.match(of(name).message, /openai\/text-embedding-3-small/, name)
    assert.match(of(name).message, /openai\/text-embedding-3-large/, name)
  }
})

test('[15-1@4] a sealed column in a filter, a sort, a group, an index, search or unique, or named by a from, is F2011 from the check', async () => {
  const folder = copyOf('sealed', 'sealed')
  const made = await checkRules(folder)
  assert.deepEqual(
    found(made.findings),
    [
      ...['indexed:F2011', 'uniqued:F2011', 'searched:F2011', 'worked:F2011', 'flagged:F2011', 'flagged:F2011'],
      ...['byKey:F2011', 'byEither:F2011', 'sortedByKey:F2011', 'groupedByKey:F2011'],
      ...['bodyByKey:F2011', 'bodySorted:F2011'],
    ].sort(),
  )
  whole(made.findings, folder)
  const fix = made.findings.find((one) => one.where?.definition === 'byKey')?.fix ?? ''
  assert.match(fix, /fingerprint/)
})

test('[15-1@4] the cases of each rule of the safety, and of a link, a search column and an owner, are each found, and what is as the documents ask is not', async () => {
  const folder = copyOf('safety', 'safety')
  const made = await checkRules(folder)
  assert.deepEqual(
    found(made.findings),
    [
      // A link of a column and of an input to a table that is not there, a search column that is a number, an
      // owner column that links another table, and the rule 'owner' with no owner.
      ...['tasks:F2005', 'byProject:F2005', 'stock:F2006', 'desks:F2007', 'papers:F2007'],
      // Bare 'anyone' on the add of a table, on a change and on an action.
      ...['guestbook:F3002', 'sign:F3002', 'ping:F3002'],
      // Bare 'anyone' on the read of a table with a personal column, and on a query that reads one.
      ...['people:F3003', 'phoneBook:F3003', 'phones:F3003', 'bodyPhones:F3003'],
      // Full access with no `system`: `db.system` in a body, `db.sql` in code, and a member of `roles`.
      ...['peek:F3004', 'raw:F3004', 'promote:F3004'],
      'forgotten:F3005',
      // A private column in `pick`, through a link too, in a group, in a value a group works out, and in an output.
      ...['pay:F3006', 'paidBy:F3006', 'payGroups:F3006', 'payroll:F3006', 'payOut:F3006'],
      // `system` on a function that any signed-in caller, or anyone, may call, and a write of a table of owners.
      ...['markPaid:F3009', 'dropOrder:F3009', 'payAny:F3009'],
    ].sort(),
  )
  whole(made.findings, folder)
  const of = (name: string): Finding => {
    const one = made.findings.find((finding) => finding.where?.definition === name)
    assert.ok(one, name)
    return one
  }
  // The finding of the document: the rule of the table, the kind of write, and the two ways out.
  assert.match(of('markPaid').message, /"change" on orders is 'owner'/)
  assert.match(of('markPaid').fix ?? '', /remove `system`, or keep it and add a check that the caller owns/i)
  assert.match(of('tasks').message, /projects/)
  assert.match(of('raw').message, /db\.sql/)
  assert.match(of('peek').message, /db\.system/)
  assert.match(of('promote').message, /roles\.add/)
  const text = readFileSync(join(folder, 'functions', 'office.ts'), 'utf8')
  assert.equal(of('raw').where?.line, lineWith(text, "await db.sql('SELECT 1')"))
})

test('[15-1@4] a flow and an agent that name a door in `offer` and state no `access` are F3001, each at its own line, and a function with none is not', async () => {
  const folder = copyOf(join('F3001', 'fail'), 'F3001-each')
  const made = await checkRules(folder)
  assert.deepEqual(found(made.findings), ['helper:F3001', 'tidy:F3001'])
  const text = readFileSync(join(folder, 'flows', 'tidy.ts'), 'utf8')
  const lines = made.findings.map((one) => [one.where?.definition, one.where?.file, one.where?.line]).sort()
  assert.deepEqual(lines, [
    ['helper', 'flows/tidy.ts', lineWith(text, "agent('helper'")],
    ['tidy', 'flows/tidy.ts', lineWith(text, "flow('tidy'")],
  ])
  assert.match(made.findings.find((one) => one.where?.definition === 'tidy')?.message ?? '', /api/)
  assert.match(made.findings.find((one) => one.where?.definition === 'helper')?.message ?? '', /mcp/)
  // A function states `access` as a required option: one with none is told by the description, under its own code.
  const missing = await checkRules(copyOf(join('F1008', 'fail'), 'F1008-not-F3001'))
  assert.deepEqual([...new Set(missing.findings.map((one) => one.code))], ['F1008'])
})
