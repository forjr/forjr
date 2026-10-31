import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import type { App } from '../../engine/index.ts'
import { buildProject } from '../../build/index.ts'
import { copyOf } from './projects.ts'
import type { ByHand, Siege } from './sieges.ts'
import { asNobody, asSystem, besieged, callOf, logOf, refusedWith, siegeBundle, wire } from './sieges.ts'

// What each of the staff is paid: numbers that stand nowhere else, so that an answer is searched for them.
const pays = [111_111, 222_222, 333_333]
const sums = [333_333, 666_666, 444_444, 555_555]

/** Adds the staff, as the system: two at one desk and one at another. */
async function staffed(app: App): Promise<void> {
  await app.write(
    [
      { add: 'staff', values: { name: 'Ada', desk: 'north', pay: pays[0] } },
      { add: 'staff', values: { name: 'Bob', desk: 'north', pay: pays[1] } },
      { add: 'staff', values: { name: 'Cy', desk: 'south', pay: pays[2] } },
    ],
    { as: 'system' },
  )
}

/** Fails where a text holds what any of the staff is paid, or a sum of it. */
function holdsNoPay(text: string, what: string): void {
  for (const number of [...pays, ...sums]) assert.equal(text.includes(String(number)), false, `${what} holds ${number}`)
  assert.equal(/"pay"|leaked/.test(text), false, `${what} names the column`)
}

test('[05-2.8] a function that answers a row with a private column: the column is in no answer, a copy of the row is F0009, and the change of a handed row fails', async (t) => {
  const siege = await besieged(t)
  await staffed(siege.app)
  // Through a stated output, and through a query in code that states none.
  const out = await wire(siege, { path: callOf('paidOut') })
  assert.deepEqual(out.body, { ok: true, value: [{ name: 'Ada' }, { name: 'Bob' }, { name: 'Cy' }] })
  const raw = await wire(siege, { path: callOf('paidRaw') })
  assert.equal(raw.status, 200)
  assert.deepEqual(
    Object(raw.body.value).map((row: object) => Object.keys(row).sort()),
    Array(3).fill(['createdAt', 'desk', 'id', 'name', 'updatedAt']),
  )
  // A copy of the row is no row that `db` handed out.
  const copy = await wire(siege, { path: callOf('paidCopy') })
  assert.deepEqual([copy.status, copy.error.code], [500, 'F0009'])
  // A handed row that the code tries to change: the change fails, and the answer holds nothing of it.
  const changed = await wire(siege, { path: callOf('paidChanged') })
  assert.equal(changed.text.includes('changed'), false)
  assert.equal(changed.status === 500 || changed.status === 200, true)
  for (const [what, answer] of Object.entries({ out, raw, copy, changed })) holdsNoPay(answer.text, what)
  // On test data, where the full message is sent, the message holds none of it either.
  const onTest = await besieged(t, { open: { mode: 'test' } })
  await staffed(onTest.app)
  for (const name of ['paidOut', 'paidRaw', 'paidCopy', 'paidChanged'])
    holdsNoPay((await wire(onTest, { path: callOf(name) })).text, `${name} on test data`)
})

/** The tables and the triggers of the data file of a siege, read beside the engine that has it open. */
function schemaOf(siege: Siege): string[] {
  const db = new DatabaseSync(join(siege.dataFolder, 'data.db'), { readOnly: true })
  try {
    return db
      .prepare('SELECT type, name FROM sqlite_master ORDER BY type, name')
      .all()
      .map((row) => `${row.type} ${row.name}`)
  } finally {
    db.close()
  }
}

test('[05-2.20] raw SQL of a function that states system: a text that names a table of the engine, two statements, COMMIT, a trigger, and in a query a text that writes are refused, and nothing is read or written', async (t) => {
  const siege = await besieged(t, { limits: { anyonePerMinute: 100_000 } })
  await siege.app.call('addWord', { text: 'held' }, asSystem)
  const schema = schemaOf(siege)
  const readWords = () => siege.app.read({ from: 'words' }, { as: 'system' })
  const before = JSON.stringify(await readWords())
  const refused: [string, string, string, string][] = [
    ['a text that names _f_sessions', 'rawRead', 'SELECT * FROM "_f_sessions"', 'F0013'],
    ['a text that names _f_sessions, in a change', 'rawWrite', 'DELETE FROM "_f_sessions"', 'F0013'],
    ['a text that names _f_here', 'rawRead', 'SELECT * FROM _f_here', 'F0013'],
    ['a text that names _f_meta in capitals', 'rawRead', 'SELECT * FROM _F_META', 'F0013'],
    ['a text that names _f_rate in brackets', 'rawRead', 'SELECT * FROM [_f_rate]', 'F0013'],
    ['a text that names _f_meta under the name of the file', 'rawRead', 'SELECT * FROM main."_f_meta"', 'F0013'],
    ['a write to a table of the engine', 'rawWrite', `UPDATE "_f_meta" SET "value" = 'x'`, 'F0013'],
    ['two statements', 'rawWrite', `INSERT INTO "words" ("text") VALUES ('a'); DELETE FROM "words"`, 'F0013'],
    ['two statements, the second a read', 'rawRead', 'SELECT 1; SELECT * FROM "users"', 'F0013'],
    ['COMMIT', 'rawWrite', 'COMMIT', 'F0013'],
    ['COMMIT after a write', 'rawWrite', 'DELETE FROM "words"; COMMIT', 'F0013'],
    ['COMMIT in small letters, and ROLLBACK, and BEGIN', 'rawWrite', 'commit', 'F0013'],
    ['END', 'rawWrite', 'END TRANSACTION', 'F0013'],
    ['ROLLBACK', 'rawWrite', 'ROLLBACK', 'F0013'],
    ['SAVEPOINT', 'rawWrite', 'SAVEPOINT attack', 'F0013'],
    [
      'a trigger',
      'rawWrite',
      'CREATE TRIGGER "attack" AFTER INSERT ON "words" BEGIN DELETE FROM "words"; END',
      'F0013',
    ],
    [
      'a trigger that outlasts its write',
      'rawWrite',
      'CREATE TEMP TRIGGER "attack" AFTER INSERT ON "words" BEGIN DELETE FROM "words"; END',
      'F0013',
    ],
    [
      'a text that writes, in a query',
      'rawRead',
      `INSERT INTO "words" ("text") VALUES ('written by a query')`,
      'F0012',
    ],
    ['a text that removes, in a query', 'rawRead', 'DELETE FROM "words"', 'F0012'],
    ['a text that changes, in a query', 'rawRead', `UPDATE "words" SET "text" = 'changed by a query'`, 'F0012'],
  ]
  for (const [what, name, sql, code] of refused) {
    assert.equal(await refusedWith(siege.app.call(name, { sql }, asNobody)), code, what)
    // Over the web the caller is told that something went wrong, and no row.
    const answer = await wire(siege, { path: callOf(name), input: { sql } })
    assert.deepEqual(
      [answer.status, answer.error.code, Object.keys(answer.body).sort()],
      [500, 'F0009', ['error', 'ok']],
      what,
    )
    assert.equal(JSON.stringify(await readWords()), before, what)
  }
  assert.deepEqual(schemaOf(siege), schema)
  // The function itself works: a read of a table of the app is answered.
  const read = await siege.app.call('rawRead', { sql: 'SELECT "text" FROM "words"' }, asNobody)
  assert.deepEqual(read, [{ text: 'held' }])
})

test('[05-2.21] a query that groups by a private column, and one that sums it there, answers neither the values nor the sum', async (t) => {
  // A plain query that groups by the column, and sums it, is in no description that a build writes: this one is changed by hand.
  const byHand = (group: object) => (description: ByHand) => {
    description.functions.paidByDesk.plan = { from: 'staff', group }
  }
  const sum = { n: { count: true }, all: { sum: 'pay' }, top: { max: 'pay' }, mid: { avg: 'pay' }, low: { min: 'pay' } }
  for (const [what, group] of Object.entries({
    'grouped by the column': { by: ['pay'], values: { n: { count: true } } },
    'summed there': { by: ['desk'], values: sum },
    'grouped by it and summed': { by: ['pay'], values: sum },
    'grouped by nothing and summed': { by: [], values: sum },
  })) {
    const siege = await besieged(t, { change: byHand(group) })
    await staffed(siege.app)
    const answer = await wire(siege, { path: callOf('paidByDesk') })
    holdsNoPay(answer.text, what)
    if (answer.status === 200)
      for (const row of Object(answer.body.value))
        for (const field of Object.keys(row))
          assert.ok(['n', 'desk'].includes(field), `${what}: the answer holds ${field}`)
  }
  // Written with `run` and no `output`.
  const siege = await besieged(t)
  await staffed(siege.app)
  for (const name of ['paidGrouped', 'paidSummed']) {
    const answer = await wire(siege, { path: callOf(name) })
    holdsNoPay(answer.text, name)
    assert.equal([200, 500].includes(answer.status), true, name)
  }
})

test('[05-2.22@4] an action whose db is limited to its caller reads a table with a private column and answers the rows as they are: the column is in no row', async (t) => {
  const siege = await besieged(t)
  await staffed(siege.app)
  const answer = await wire(siege, { path: callOf('paidAct') })
  assert.equal(answer.status, 200)
  assert.deepEqual(
    Object(answer.body.value).map((row: Record<string, unknown>) => [row.name, 'pay' in row]),
    [
      ['Ada', false],
      ['Bob', false],
      ['Cy', false],
    ],
  )
  holdsNoPay(answer.text, 'the answer of the action')
})

/** A body, written by hand, of statements that each double a text with the sign `+`, and answer how long it is. */
const doubledBySign = (times: number): object[] => [
  { const: 'seed', value: '0123456789' },
  ...Array.from({ length: times }, (_, i) => {
    const from = { name: [i === 0 ? 'seed' : `t${i}`] }
    return { const: `t${i + 1}`, value: { left: from, op: '+', right: from } }
  }),
  { return: { name: [`t${times}`, 'length'] } },
]

test('[05-2.23] a plain run that walks a million entries, that asks for a range of ten thousand million, that doubles a text forty times, and two plain queries that call each other, are each stopped, and the engine keeps answering', async (t) => {
  const siege = await besieged(t, { limits: { queryTime: 300 } })
  const answers = async (): Promise<void> =>
    assert.deepEqual((await wire(siege, { path: callOf('whoAmI') })).body, { ok: true, value: 'no user' })
  // Each is a `run` that was read: the description holds its body, and no code.
  for (const name of ['walks', 'widens', 'doubles', 'ping', 'pong'])
    assert.ok(Array.isArray(siege.app.description.functions[name].body), `${name} is plain`)
  for (const [name, code] of [
    ['walks', 'F0008'],
    ['widens', 'F0027'],
    ['doubles', 'F0027'],
    ['ping', 'F0028'],
  ] as const) {
    const began = performance.now()
    assert.equal(await refusedWith(siege.app.call(name, name === 'ping' ? { n: 1 } : {}, asNobody)), code, name)
    assert.ok(performance.now() - began < 5000, `${name} was stopped in time`)
    await answers()
  }
  // Over the web: the time is told as itself, and the other two as an error that is not the caller's to see.
  assert.deepEqual((await wire(siege, { path: callOf('walks') })).error.code, 'F0008')
  for (const [name, code] of [
    ['widens', 'F0027'],
    ['doubles', 'F0027'],
    ['ping', 'F0028'],
  ] as const) {
    const answer = await wire(siege, { path: callOf(name), input: name === 'ping' ? { n: 1 } : {} })
    assert.deepEqual([answer.status, answer.error.code], [500, 'F0009'], name)
    const row = logOf(siege.dataFolder, 'calls').findLast((one) => one.name === name && one.ref === answer.error.ref)
    assert.equal(row?.code, code, name)
  }
  await answers()
})

test('[05-2.23] a plain run that doubles a text with the sign +, as a stored body holds it, makes no text past valueSize: F0027', async (t) => {
  // Twenty-one doublings of ten characters are twenty million, twenty times `valueSize`. A build stores the sign
  // as it stores a word, and no build is needed: the body stands in a description that is changed by hand.
  const siege = await besieged(t, {
    change: (description) => {
      description.functions.widens.body = doubledBySign(21)
    },
  })
  const made = await siege.app.call('widens', {}, asNobody).catch((error: unknown) => Object(error).code)
  assert.equal(made, 'F0027', `the body made a text of ${made} characters, and valueSize is 1,000,000`)
})

test('[05-2.23] a member called on a name that holds a text is code, and in a definition that states plain: true F1010', async (t) => {
  const siege = await besieged(t)
  const { shouts, whispers } = siege.app.description.functions
  assert.deepEqual([shouts.form, Array.isArray(shouts.body)], ['code', false])
  assert.deepEqual([whispers.form, Array.isArray(whispers.body)], ['plain', true])
  // A project that holds the two and nothing else, each of them `plain: true`.
  const project = copyOf(t, 'bare')
  const about = "access: anyone('an attack calls it'), input: { text: text() }, output: text()"
  const run = (last: string): string => `run: ({ input }) => {\n    const said = input.text\n    return ${last}\n  }`
  const source = (name: string, last: string): string =>
    `export const ${name} = query('${name}', {\n  ${about},\n  plain: true,\n  ${run(last)},\n})\n`
  mkdirSync(join(project, 'functions'), { recursive: true })
  const build = async (text: string): Promise<string[]> => {
    writeFileSync(join(project, 'functions', 'said.ts'), `import { anyone, query, text } from 'forjr'\n\n${text}`)
    const built = await buildProject(project, { for: 'dev', out: join(project, 'bundle') })
    return built.findings.filter((one) => one.level === 'error').map((one) => one.code)
  }
  assert.deepEqual(await build(source('whispers', 'said')), [])
  assert.deepEqual(await build(source('shouts', 'said.toUpperCase()')), ['F1010'])
})

test('[05-2.23] a stored body, written by hand, that names a value it read as the thing to call: the stored forms hold none that calls a value, F0011', async (t) => {
  const marked = (): boolean => process.env.FORJR_SIEGE_MARK !== undefined
  t.after(() => void delete process.env.FORJR_SIEGE_MARK)
  const read = { name: ['input', 'text'] }
  const mark = 'process.env.FORJR_SIEGE_MARK = "ran"'
  // Each body, and where it is refused: a form that calls a value does not pass when the app opens, and a name
  // that is no word of ours, or no member of a chain that `db` handed out, fails when it is reached.
  const bodies: [string, 'opening' | 'call', object[]][] = [
    ['a call of a name', 'opening', [{ return: { call: read, args: [] } }]],
    ['a call of a read', 'opening', [{ return: { call: { read, path: ['constructor'] }, args: [mark] } }]],
    ['a call of a value', 'opening', [{ return: { call: { value: read }, args: [] } }]],
    ['a call with no kind', 'opening', [{ return: { call: {}, args: [] } }]],
    ['a word that is a read', 'opening', [{ return: { fn: read, args: [] } }]],
    ['an arrow that is a name', 'opening', [{ return: { fn: 'each', args: [[1], read] } }]],
    ['a word that is none of ours', 'call', [{ return: { fn: 'eval', args: [mark] } }]],
    ['a word that every thing has', 'call', [{ return: { fn: 'constructor', args: [mark] } }]],
    ['a word of the runtime', 'call', [{ return: { fn: 'Function', args: [mark] } }]],
    ['a member of a text', 'call', [{ return: { plan: read, then: [{ toUpperCase: [] }] } }]],
    [
      'a member of the list that db handed out',
      'call',
      [
        { const: 'rows', value: { plan: { db: 'words' }, then: [{ all: [] }] } },
        { return: { plan: { name: ['rows'] }, then: [{ map: [read] }] } },
      ],
    ],
    [
      'a member that every thing has',
      'call',
      [{ return: { plan: { db: 'words' }, then: [{ constructor: [] }, { constructor: [mark] }] } }],
    ],
  ]
  for (const [what, where, body] of bodies) {
    const bundle = await siegeBundle(t, (description) => {
      description.functions.whispers.body = body
    })
    const opened: Siege[] = []
    const refusedAt = await refusedWith(besieged(t, { bundle }).then((siege) => void opened.push(siege)))
    if (where === 'opening') assert.equal(refusedAt, 'F0011', what)
    for (const siege of opened) {
      const called = await refusedWith(siege.app.call('whispers', { text: 'toUpperCase' }, asNobody))
      assert.ok(called === 'F0011' || called === 'F0009', `${what}: the call was answered ${called}`)
      assert.equal((await wire(siege, { path: callOf('whispers'), input: { text: 'x' } })).status, 500, what)
      await siege.engine.close()
    }
    assert.equal(marked(), false, `${what}: a text of the body ran as code`)
  }
})
