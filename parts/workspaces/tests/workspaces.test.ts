import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  asked,
  calledAt,
  copiedTo,
  held,
  identify,
  nameOf,
  nobody,
  ownerOf,
  product,
  system,
  closing,
  folderOf,
  templates,
} from './held.ts'
import { apartRoom, createEngine, writeKey } from '../../engine/index.ts'
import { testSandbox } from './sandbox.ts'
import { buildProject, describeProject } from '../../build/index.ts'
import { openHistory } from '../../history/index.ts'
import { serveSync } from '../../publish/index.ts'
import { attacked } from './attacked.ts'
import { refusal, toolTemplates } from './tooled.ts'

test('[40-18a] two workspaces in one engine: neither reads a row, a file or a secret of the other by a call or an address', async (t) => {
  const at = await held(t, { identify })
  const { workspaces, port } = at
  const owner = await ownerOf(at, 'ada@example.com')
  const one = await workspaces.create({ owner, from: 'blank', name: 'Notes of Ada' })
  const two = await workspaces.create({ owner: await ownerOf(at, 'bob@example.com'), from: 'blank' })
  assert.notEqual(one.id, two.id)
  assert.match(one.id, /^[0-9a-hjkmnp-tv-z]{26}$/, 'the id has the form of the id of a row')
  assert.equal(workspaces.get(one.id)?.folder, one.folder)
  assert.deepEqual(
    workspaces.list({ owner }).map((w) => w.id),
    [one.id],
  )
  const ofOne = await workspaces.run(one.id)
  const ofTwo = await workspaces.run(two.id)
  assert.equal(await workspaces.run(one.id), ofOne, 'the same app while it stays open')

  // A row of the one is no row of the other, by a call of a program and at the other's address.
  await ofOne.call('addNote', { body: 'of the one' }, { as: nobody })
  assert.deepEqual(await ofTwo.call('allNotes', {}, { as: nobody }), [])
  const atTwo = await calledAt(port, nameOf(two.id), 'allNotes', {})
  assert.deepEqual(atTwo.value, [])
  const atOne = await calledAt(port, nameOf(one.id), 'allNotes', {})
  assert.deepEqual(
    Object(atOne.value).map((row: { body: string }) => row.body),
    ['of the one'],
  )

  // A file that a person uploaded to the one is found at its address alone.
  const ada = { 'x-test-user': 'ada@example.com' }
  const upload = await asked(port, nameOf(one.id), '/_f/files?name=note.txt', {
    method: 'POST',
    body: 'a note',
    headers: { ...ada, 'content-type': 'text/plain' },
  })
  assert.equal(upload.status, 200, upload.body)
  const file = String(JSON.parse(upload.body).value.id)
  assert.equal((await asked(port, nameOf(one.id), `/_f/files/${file}`, { headers: ada })).body, 'a note')
  const elsewhere = await asked(port, nameOf(two.id), `/_f/files/${file}`, { headers: ada })
  assert.equal(elsewhere.status, 404)

  // A secret of the one is set on its test side, and the other holds none.
  await workspaces.values(one.id, { side: 'test', kind: 'secret', name: 'STRIPE_KEY', value: 'sk_one' })
  assert.deepEqual(await workspaces.values(one.id, { side: 'test', kind: 'secret', list: true }), ['STRIPE_KEY'])
  assert.deepEqual(await workspaces.values(two.id, { side: 'test', kind: 'secret', list: true }), [])

  // Each lies in a folder of its own, with its project, its data and its record.
  const record = JSON.parse(readFileSync(join(one.folder, 'workspace.json'), 'utf8'))
  assert.deepEqual(
    { format: record.format, id: record.id, owner: record.owner, name: record.name },
    { format: 'forjr.workspace/1', id: one.id, owner, name: 'Notes of Ada' },
  )
  assert.ok(existsSync(join(one.folder, 'project', 'forjr.ts')))
  assert.ok(existsSync(join(one.folder, 'data', 'data.db')))
  assert.ok(!existsSync(join(two.folder, 'data', 'files')) || !existsSync(join(two.folder, 'data', 'files', file)))
})

test('[40-18a] an id that is no id of a workspace is not found, by get, run and remove', async (t) => {
  const { workspaces } = await held(t)
  assert.equal(workspaces.get('../x'), undefined)
  assert.equal(workspaces.get('0000000000000000000000000z'), undefined)
  await assert.rejects(workspaces.run('../x'), { code: 'F0001' })
  await assert.rejects(workspaces.remove('../x'), { code: 'F0001' })
})

test('[40-18a] identify of the product names the user of a workspace app, by its own row there', async (t) => {
  const at = await held(t, { identify })
  const { workspaces, port } = at
  const one = await workspaces.create({ owner: await ownerOf(at, 'ada@example.com'), from: 'blank' })
  const app = await workspaces.run(one.id)
  const ada = { 'x-test-user': 'ada@example.com' }
  // The app asks the product's identify who a request is, as step 3 of its door does.
  const named = await app.caller(new Request(`http://${nameOf(one.id)}:${port}/`, { headers: ada }))
  assert.equal(named.kind, 'user')
  const id = String(named.user?.id)
  const me = await calledAt(port, nameOf(one.id), 'whoAmI', {}, ada, id)
  assert.equal(me.ok, true, JSON.stringify(me))
  assert.equal(Object(me.value).email, 'ada@example.com')
  // The row was added the first time, and the second request is the same user.
  const again = await calledAt(port, nameOf(one.id), 'whoAmI', {}, ada, id)
  assert.equal(Object(again.value).id, Object(me.value).id)
  const rows = await app.read({ from: 'users' }, { as: 'system' })
  assert.equal(Object(rows).length, 1)
  // A request that names nobody is nobody.
  const none = await calledAt(port, nameOf(one.id), 'whoAmI', {})
  assert.equal(none.error?.code, 'F0006')
})

test('[40-18a] a workspace that was idle falls asleep, and answers its next request through onRequest', async (t) => {
  const at = await held(t, { sleepAfter: '1 second' })
  const { workspaces, port, engine } = at
  const one = await workspaces.create({ owner: await ownerOf(at, 'ada@example.com'), from: 'blank' })
  const app = await workspaces.run(one.id)
  await app.call('addNote', { body: 'kept' }, { as: system })
  const slept = new Promise<void>((done) => engine.on('app.asleep', () => done()))
  const woke = new Promise<void>((done) => engine.on('app.woke', () => done()))
  await slept
  const answer = await calledAt(port, nameOf(one.id), 'allNotes', {})
  await woke
  assert.deepEqual(
    Object(answer.value).map((row: { body: string }) => row.body),
    ['kept'],
  )
})

test('[40-18a] a workspace copied as a folder runs, and one that was put there while the program ran is opened by its first request', async (t) => {
  const first = await held(t)
  const owner = await ownerOf(first, 'ada@example.com')
  const one = await first.workspaces.create({ owner, from: 'blank' })
  const app = await first.workspaces.run(one.id)
  await app.call('addNote', { body: 'carried' }, { as: system })
  await first.workspaces.close()
  await first.engine.close()

  // Another program, with workspaces of its own: the folder is put there while it runs. The owner is no user of
  // that product, so the workspace is built in a box and run in the room of the workspaces.
  const second = await held(
    t,
    { sandbox: testSandbox(t), room: apartRoom },
    await product(t, join(first.folder, 'second')),
  )
  assert.equal(second.workspaces.get(one.id), undefined)
  copiedTo(first.root, one.id, second.root)
  const answer = await calledAt(second.port, nameOf(one.id), 'allNotes', {})
  assert.ok(Array.isArray(answer.value), JSON.stringify(answer))
  assert.deepEqual(
    answer.value.map((row: { body: string }) => row.body),
    ['carried'],
  )
  assert.equal(second.workspaces.get(one.id)?.owner, owner)
  // A third program finds it on the disk when its workspaces are made.
  await second.workspaces.close()
  await second.engine.close()
  const third = await held(
    t,
    { sandbox: testSandbox(t), room: apartRoom },
    await product(t, join(first.folder, 'third')),
  )
  copiedTo(second.root, one.id, third.root)
  await third.workspaces.close()
  const fourth = await held(t, { folder: third.root, sandbox: testSandbox(t), room: apartRoom }, third)
  const opened = await fourth.workspaces.run(one.id)
  assert.deepEqual(
    Object(await opened.call('allNotes', {}, { as: nobody })).map((row: { body: string }) => row.body),
    ['carried'],
  )
})

test('[40-18a] a workspace removed is gone with its folder, and its name answers no more', async (t) => {
  const at = await held(t)
  const { workspaces, port } = at
  const one = await workspaces.create({ owner: await ownerOf(at, 'ada@example.com'), from: 'blank' })
  await workspaces.run(one.id)
  assert.equal((await calledAt(port, nameOf(one.id), 'allNotes', {})).ok, true)
  await workspaces.remove(one.id)
  assert.equal(workspaces.get(one.id), undefined)
  assert.equal(existsSync(one.folder), false)
  const gone = await asked(port, nameOf(one.id), '/_f/call/allNotes', { method: 'POST', body: '{}' })
  assert.equal(gone.status, 421)
})

test('[40-18a] a workspace made from another copies its files and none of its data, and the mail of its test side is written down', async (t) => {
  const at = await held(t, {})
  const { workspaces } = at
  const owner = await ownerOf(at, 'ada@example.com')
  const one = await workspaces.create({ owner, from: 'blank' })
  const app = await workspaces.run(one.id)
  await app.call('addNote', { body: 'of the one' }, { as: nobody })
  const copy = await workspaces.create({ owner, from: one.id })
  assert.ok(existsSync(join(copy.folder, 'project', 'tables', 'users.ts')))
  const copied = await workspaces.run(copy.id)
  assert.deepEqual(await copied.call('allNotes', {}, { as: nobody }), [])
  assert.deepEqual(await workspaces.mail(copy.id), [])
})

// What a publish of a workspace holds it to, and what the policy holds.

// A query with no limit, which the build takes and the check refuses (F4004).
const unbounded = `import { query } from 'forjr'
import { notes } from '../tables/users'

export const everyNote = query('everyNote', { about: 'Every note', access: 'signedIn', rows: notes.where({ body: 'open' }) })
`

test("[40-18a] a workspace whose files fail the check is not published into the product's own engine", async (t) => {
  const at = await product(t, folderOf(t))
  const live = (id: string) => ({
    dataFolder: join(at.folder, 'live', id),
    address: `http://${id}.live.test:${at.port}`,
  })
  const made = await held(t, { live, trusted: ['staff'] }, at)
  const [row] = Object(
    await at.app.write([{ add: 'users', values: { email: 'ada@example.com', roles: ['staff'] } }], { as: 'system' }),
  )
  const workspace = await made.workspaces.create({ owner: String(Object(row).id), from: 'blank' })
  writeFileSync(join(workspace.folder, 'project', 'functions', 'everyNote.ts'), unbounded)
  // `40`, section 8, point 6: "`publish` builds and checks the point and makes it live".
  const done = await made.workspaces.publish(workspace.id).then(
    (published) => `published ${published.version}`,
    (error: { code?: string }) => String(error.code),
  )
  assert.equal(done, 'F9101')
})

test('[40-17] the tool check of a workspace built in a box answers the findings of the check, beside those of the build', async (t) => {
  const sandbox = testSandbox(t)
  const at = await held(
    t,
    { sandbox, room: apartRoom, templates: toolTemplates },
    await product(t, folderOf(t), 'builder'),
  )
  // An owner who holds no role that `trusted` names: the workspace is built in its box.
  const [row] = Object(
    await at.app.write([{ add: 'users', values: { email: 'ada@example.com', roles: [] } }], { as: 'system' }),
  )
  const owner = String(Object(row).id)
  const made = await at.workspaces.create({ owner, from: 'blank' })
  writeFileSync(join(made.folder, 'project', 'functions', 'everyNote.ts'), unbounded)
  const caller = { kind: 'user' as const, user: { id: owner, roles: [] } }
  const told: unknown = await at.workspaces.tool(made.id, 'check', {}, { caller, agent: 'builder' })
  const codes = (Array.isArray(Reflect.get(Object(told), 'findings')) ? Object(told).findings : []).map(
    (one: unknown) => String(Reflect.get(Object(one), 'code')),
  )
  assert.ok(codes.includes('F4004'), `the check answered ${codes.join(', ') || 'nothing'}`)
})

test('[40-20] a workspace of code that was opened again on its last build, after the program started again, is published to a Target', async (t) => {
  const folder = folderOf(t)
  const served = await buildProject(templates.coded, { for: 'release', out: join(folder, 'served-bundle') })
  const engine = createEngine({ port: 0 })
  closing(t, () => engine.close())
  const data = join(folder, 'served-data')
  const there = await engine.open(served.bundleFolder, { dataFolder: data, mode: 'live' })
  const history = openHistory(data)
  closing(t, () => history.close())
  serveSync(engine, there, history)
  const address = `http://127.0.0.1:${JSON.parse(readFileSync(join(data, 'engine.json'), 'utf8')).port}`
  const target = { address, key: writeKey(there, { name: 'deploy', rights: ['publish'] }).key }
  const sandbox = testSandbox(t)
  const options = { sandbox, room: apartRoom, live: () => target }
  const first = await held(t, options)
  const [row] = Object(
    await first.app.write([{ add: 'users', values: { email: 'ada@example.com', roles: [] } }], { as: 'system' }),
  )
  const made = await first.workspaces.create({ owner: String(Object(row).id), from: 'coded' })
  await first.workspaces.run(made.id)
  // The program starts again: the workspaces are made anew over the same folder, and open the build they kept.
  await first.workspaces.close()
  const again = await held(t, options, first)
  await again.workspaces.run(made.id)
  const done = await again.workspaces.publish(made.id).then(
    (published) => published.version,
    (error: { code?: string; message?: string }) => `${error.code} ${error.message}`,
  )
  assert.equal(there.versions().find((one) => one.running)?.id, done)
})

test('[05-16.3] a write of a file that holds no definition, which moves the address of a service outside reaches, is F9105', async (t) => {
  const at = await attacked(t)
  const service = [
    "import { post, service } from 'forjr'",
    "import { payAt } from './hosts'",
    '',
    "export const pay = service('pay', { url: payAt, calls: { send: post('/x') } })",
    '',
  ].join('\n')
  await at.tool('write', { path: 'functions/hosts.ts', text: "export const payAt = 'https://api.example.com'\n" })
  await at.tool('write', { path: 'functions/pay.ts', text: service })
  const app = await at.workspaces.run(at.made.id)
  assert.equal(Reflect.get(Object(app.description.services.pay), 'url'), 'https://api.example.com')
  // `40`, section 10: "Everything is refused unless the policy allows it"; `05` (section 16), row 3: a service that
  // reaches a host outside `reaches` is refused "whatever the model answered".
  const moved = await refusal(
    at.tool('write', { path: 'functions/hosts.ts', text: "export const payAt = 'https://evil.example'\n" }),
  )
  // The project as the build reads it now: the service of a file the write did not touch reaches the new host.
  const now = (await describeProject(join(at.made.folder, 'project'))).description.services.pay
  assert.deepEqual([moved?.code, Reflect.get(Object(now), 'url')], ['F9105', 'https://api.example.com'])
})

test('[40-18a] a workspace rebuilt after a change of a file that a definition imports runs the definition as its files now give it', async (t) => {
  const at = await held(t)
  const [row] = Object(
    await at.app.write([{ add: 'users', values: { email: 'ada@example.com', roles: ['builder'] } }], { as: 'system' }),
  )
  const made = await at.workspaces.create({ owner: String(Object(row).id), from: 'blank' })
  const functions = join(made.folder, 'project', 'functions')
  writeFileSync(join(functions, 'hosts.ts'), "export const payAt = 'https://one.example.com'\n")
  writeFileSync(
    join(functions, 'pay.ts'),
    "import { post, service } from 'forjr'\nimport { payAt } from './hosts'\n\nexport const pay = service('pay', { url: payAt, calls: { send: post('/x') } })\n",
  )
  const first = await at.workspaces.run(made.id)
  assert.equal(Reflect.get(Object(first.description.services.pay), 'url'), 'https://one.example.com')
  writeFileSync(join(functions, 'hosts.ts'), "export const payAt = 'https://two.example.com'\n")
  const rebuilt = await at.workspaces.rebuild(made.id, { kind: 'tool' })
  const app = await at.workspaces.run(made.id)
  assert.equal(app.versions().find((one) => one.running)?.id, rebuilt.version)
  assert.equal(Reflect.get(Object(app.description.services.pay), 'url'), 'https://two.example.com')
})
