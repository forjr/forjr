import assert from 'node:assert/strict'
import { test } from 'node:test'
import { publish, breaks, impactOf, serveSync } from '../index.ts'
import { computer, fetched, folderOf, started, ada, closing } from './server.ts'
import { cpSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildProject } from '../../build/index.ts'
import type { Description } from '../../core/internal.ts'
import { createEngine, keptAlone, writeKey } from '../../engine/index.ts'
import type { History } from '../../history/index.ts'
import { openHistory } from '../../history/index.ts'

const functions = 'functions/orders.ts'
const tables = 'tables/orders.ts'

/** What a promise was refused with, or nothing where it was kept. */
const refusal = (
  done: Promise<unknown>,
): Promise<{ code?: string; message?: string; fields?: Record<string, string> } | undefined> =>
  done.then(
    () => undefined,
    (error: { code?: string; message?: string; fields?: Record<string, string> }) => error,
  )

test('[40-15b] the first publish follows a bundle that was brought by hand, and --back switches to the version before, also across an added column', async (t) => {
  const folder = folderOf(t)
  const server = await started(t, folder)
  const here = computer(t, folder, 'here')
  const to = server.key(['read', 'push', 'publish'])
  await here.save()
  const one = await publish({ project: here.project, history: here.history, to, fetch: fetched })
  assert.equal(server.history.pointer('live'), one.point)
  assert.equal(server.app.versions().find((v) => v.running)?.id, one.version)

  here.edit(
    tables,
    '    note: text({ optional: true, max: NOTE_LENGTH }),',
    '    note: text({ optional: true, max: NOTE_LENGTH }),\n    rush: boolean({ optional: true }),',
  )
  await here.save()
  const two = await publish({ project: here.project, history: here.history, to, fetch: fetched })
  assert.equal(server.app.versions().find((v) => v.running)?.id, two.version)
  assert.deepEqual(
    server.history.read(two.point)?.parents,
    [here.history.find('now')?.id, one.point],
    'the parents are the point and what was live',
  )

  const back = await publish({ project: here.project, history: here.history, to, fetch: fetched, back: true })
  assert.equal(back.version, one.version)
  assert.equal(server.app.versions().find((v) => v.running)?.id, one.version)
  assert.equal(server.history.pointer('live'), one.point)
  const again = await refusal(publish({ project: here.project, history: here.history, to, fetch: fetched, back: true }))
  assert.equal(again?.code, 'F9103', 'the first published point has nothing before it')
  assert.equal(again?.fields?.reason, 'nothing')
})

test('[40-5] [16-2@8c] a table change that one live row does not fit is refused with F9103, which names it; try answers it with nothing changed', async (t) => {
  const folder = folderOf(t)
  const server = await started(t, folder)
  const here = computer(t, folder, 'here')
  const to = server.key(['read', 'push', 'publish'])
  await here.save()
  await publish({ project: here.project, history: here.history, to, fetch: fetched })
  await server.app.write([{ add: 'orders', values: { title: 'one', total: 5, state: 'open' } }], { as: 'system' })
  here.edit(functions, ".limit(input('limit'))", '.limit(9)')
  here.edit(tables, '    note: text({ optional: true, max: NOTE_LENGTH }),', '    note: text({ max: NOTE_LENGTH }),')
  await here.save()
  const running = server.app.versions().find((v) => v.running)?.id
  const live = server.history.pointer('live')
  const tried = await publish({ project: here.project, history: here.history, to, fetch: fetched, try: true })
  assert.match(String(tried.refused), /^rows/)
  const refused = await refusal(publish({ project: here.project, history: here.history, to, fetch: fetched }))
  assert.equal(refused?.code, 'F9103')
  assert.equal(refused?.fields?.reason, 'rows')
  assert.equal(refused?.fields?.count, '1')
  assert.equal(server.app.versions().find((v) => v.running)?.id, running, 'live is untouched')
  assert.equal(server.history.pointer('live'), live)
})

// What a publish keeps, and what its impact and its breaks hold.

/** A description that holds the parts it is handed, and nothing else. */
const holding = (parts: Record<string, object>): Description =>
  Object({
    app: { name: 'shop' },
    project: {},
    tables: {},
    functions: {},
    flows: {},
    screens: {},
    components: {},
    ...parts,
  })

const offered = (o: object = {}): object => ({
  kind: 'query',
  form: 'plain',
  access: { rule: 'signedIn' },
  offer: ['api'],
  input: {},
  output: { kind: 'object', shape: { id: { kind: 'text' }, total: { kind: 'number' } } },
  ...o,
})

test('[40-5] a publish that changes no table takes a backup of the data before it switches', async (t) => {
  const folder = folderOf(t)
  const server = await started(t, folder)
  const here = computer(t, folder, 'here')
  const to = server.key(['read', 'push', 'publish'])
  await here.save()
  await publish({ project: here.project, history: here.history, to, fetch: fetched })
  const backups = (): string[] => {
    const lies = join(server.data, 'backups')
    return existsSync(lies) ? readdirSync(lies) : []
  }
  const before = backups()
  here.edit('functions/orders.ts', ".limit(input('limit'))", '.limit(9)')
  await here.save()
  const two = await publish({ project: here.project, history: here.history, to, fetch: fetched })
  assert.equal(server.app.versions().find((one) => one.running)?.id, two.version)
  // `40`, section 5, step 6: "A backup: Of the data, as before every table change"; `20`, section 16: "before
  // every publish".
  assert.ok(
    backups().some((one) => !before.includes(one)),
    `no backup was taken: ${backups().join(', ') || 'none'}`,
  )
})

test('[40-16] an output that turns from a record into a value loses every field it gave', () => {
  const live = holding({ functions: { total: offered() } })
  const next = holding({ functions: { total: offered({ output: { kind: 'number' } }) } })
  const found = breaks(live, next).map((one) => `${one.name} ${(one.path ?? []).join('.')}`)
  assert.ok(
    found.some((one) => one.startsWith('total output')),
    `breaks holds ${found.join(', ') || 'nothing'}`,
  )
})

test('[44-2] breaks for callers outside hold an address that is gone', () => {
  const route = { method: 'POST', path: '/hooks/pay', access: { rule: 'anyone', why: 'the payer calls it' } }
  const live = holding({ routes: { pay: route } })
  const next = holding({ routes: {} })
  const impact = impactOf({ against: 'live', live, next })
  assert.ok(
    impact.breaks.some((one) => one.name === 'pay'),
    `breaks holds ${impact.breaks.map((one) => one.name).join(', ') || 'nothing'}`,
  )
})

test('[44-2] wider rights hold a new route and a new screen that anyone may reach', () => {
  const anyone = { rule: 'anyone', why: 'the shop is open' }
  const live = holding({ screens: {}, routes: {} })
  const next = holding({
    screens: { secret: { path: '/secret', access: anyone } },
    routes: { pay: { method: 'POST', path: '/hooks/pay', access: anyone } },
  })
  const rights = impactOf({ against: 'live', live, next }).rights.map((one) => one.name)
  // A new function open to anyone is held so (`rights.ts`); a new route and a new screen are reached as freely.
  assert.deepEqual(rights.sort(), ['pay', 'secret'])
})

test('[45-13] the key of the secrets of a preview lies in no file that another user may read', async (t) => {
  const folder = folderOf(t)
  const project = join(folder, 'server-project')
  cpSync(join(import.meta.dirname, 'shop'), project, { recursive: true })
  const built = await buildProject(project, { for: 'release', out: join(folder, 'bundle') })
  const data = join(folder, 'server-data')
  const engine = createEngine({ port: 0 })
  let history: History | undefined
  closing(t, async () => {
    await engine.close()
    history?.close()
  })
  const app = await engine.open(built.bundleFolder, { dataFolder: data, mode: 'test' })
  history = openHistory(data)
  serveSync(engine, app, history, { dataFolder: data, mode: 'test' })
  const port = Number(JSON.parse(readFileSync(join(data, 'engine.json'), 'utf8')).port)
  const to = {
    address: `http://localhost:${port}`,
    key: writeKey(app, { name: 'all', rights: ['read', 'push', 'publish'] }).key,
  }
  const here = computer(t, folder, 'here')
  await here.save()
  await publish({ project: here.project, history: here.history, to, fetch: fetched })
  here.history.branch('look')
  here.history.switch(here.project, 'look', ada)
  here.edit('tables/orders.ts', '    title: text({ min: 1, max: 80 }),', '    title: text({ min: 1, max: 90 }),')
  await here.save()
  await publish({ project: here.project, history: here.history, to, fetch: fetched, preview: true })
  const list = join(data, 'previews', 'previews.json')
  assert.match(readFileSync(list, 'utf8'), /"key": "[A-Za-z0-9+/]{43}="/)
  // The engine keeps a key of the secrets in a file that the current user alone may read, as `secret.key` is.
  assert.equal(keptAlone(list).why, undefined, 'previews.json holds a key of the secrets')
})
