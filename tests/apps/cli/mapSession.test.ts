import assert from 'node:assert/strict'
import fs, { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { buildProject } from '../../../parts/build/index.ts'
import { startDev } from '../../../parts/cli/dev.ts'
import { askedOfRunning } from '../../../parts/cli/reach.ts'
import { createEngine } from '../../../parts/engine/index.ts'
import { copied, typed } from '../../../parts/cli/tests/typed.ts'

/**
 * Has the system's folder for temporary files be an empty folder of the test, and counts each folder the map makes
 * there for a release build, by the one call that makes it. Answers the folder and the count so far.
 */
function counted(
  t: TestContext,
  project: string,
  // What the test does at the moment a release build for the map begins, while it is held there.
  begun: (n: number) => void = () => undefined,
): { temp: string; builds: () => number } {
  const temp = join(project, '..', 'temp')
  mkdirSync(temp)
  const was = ['TEMP', 'TMP', 'TMPDIR'].map((name) => [name, process.env[name]] as const)
  for (const [name] of was) process.env[name] = temp
  const made = fs.mkdtempSync
  let builds = 0
  fs.mkdtempSync = Object.assign((prefix: string, ...rest: [never]) => {
    if (String(prefix).includes('forjr-map-')) begun(++builds)
    return made(prefix, ...rest)
  }, made)
  syncBuiltinESMExports()
  t.after(() => {
    fs.mkdtempSync = made
    syncBuiltinESMExports()
    for (const [name, value] of was)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
  })
  return { temp, builds: () => builds }
}

test('[55-8] forjr map leaves no bundle in the project and none in the folder for temporary files, and a column makes no release build', async (t) => {
  const project = copied(t, 'map-left', 'mapShop')
  const { temp, builds } = counted(t, project)
  const map = await typed(project, 'map', '--json')
  assert.equal(map.ended, 0, map.printed)
  assert.equal(Object(map.answer.value).page, 'built')
  assert.equal(builds(), 1)
  assert.equal(existsSync(join(project, '.forjr', 'build')), false)
  assert.deepEqual(readdirSync(temp), [])
  const column = await typed(project, 'map', 'orders.status')
  assert.equal(column.ended, 0, column.printed)
  assert.equal(builds(), 1)
  const helper = await typed(project, 'map', 'functions/money.ts')
  assert.equal(helper.ended, 0, helper.printed)
  assert.equal(builds(), 1)
})

test('[55-8] with forjr dev running the map is answered by the session: a save just before it is in it, it equals the map made with no session, and a second map makes no second release build', async (t) => {
  const project = copied(t, 'map-session', 'mapShop')
  const { builds } = counted(t, project)
  const dev = await startDev(project, { port: 0, out: () => undefined })
  let closed = false
  t.after(async () => {
    if (!closed) await dev.close()
  })
  // A save made just before the map, which the watcher may not have told the session of yet.
  const file = join(project, 'functions', 'orders.ts')
  writeFileSync(
    file,
    `${readFileSync(file, 'utf8')}\nexport const lastOrders = query('lastOrders', { access: 'signedIn', rows: orders.limit(5) })\n`,
  )
  const first = await typed(project, 'map', '--json')
  assert.equal(first.ended, 0, first.printed)
  const names = (value: unknown): string[] => Object(value).lines.map((one: { name: string }) => one.name)
  assert.ok(names(first.answer.value).includes('lastOrders'), first.printed)
  assert.equal(builds(), 1)
  const second = await typed(project, 'map', '--json')
  assert.deepEqual(second.answer.value, first.answer.value)
  assert.equal(builds(), 1)
  // One definition and one column are answered by the session too.
  const one = await typed(project, 'map', 'lastOrders', '--json')
  assert.equal(Object(Object(one.answer.value).line).name, 'lastOrders')
  await dev.close()
  closed = true
  // With no session, the map made from the files is the same.
  const made = await typed(project, 'map', '--json')
  assert.deepEqual(made.answer.value, first.answer.value)
})

test('[55-8] a project that cannot be built for release is mapped as it is described, with no bytes, says so, and answers its errors as findings', async (t) => {
  const project = copied(t, 'map-unbuilt', 'mapShop')
  writeFileSync(
    join(project, 'functions', 'broken.ts'),
    "import { query } from 'forjr'\nimport { orders } from '../tables/orders'\n\nexport const broken = query('broken', { rows: orders.limit(1) })\n",
  )
  const map = await typed(project, 'map', '--json')
  assert.equal(map.ended, 1, map.printed)
  const value = Object(map.answer.value)
  assert.equal(value.page, 'unbuilt')
  assert.ok(value.lines.some((one: { name: string }) => one.name === 'openOrders'))
  assert.ok(
    (map.answer.findings ?? []).some((one) => one.code === 'F1008'),
    map.printed,
  )
  const text = await typed(project, 'map')
  assert.match(text.printed, /^maps {2}no page bytes: it does not build for release/m)
})

test('[55-8] the release build of the session is made in its order of work: two calls of map that come at once share it, and a save that comes while it is made is built after it', async (t) => {
  const project = copied(t, 'map-held', 'mapShop')
  const file = join(project, 'functions', 'orders.ts')
  // At the moment the first release build begins, a save comes: the session builds it once the release build ends.
  const { builds } = counted(t, project, (n) => {
    if (n === 1)
      writeFileSync(
        file,
        `${readFileSync(file, 'utf8')}\nexport const heldOrders = query('heldOrders', { access: 'signedIn', rows: orders.limit(3) })\n`,
      )
  })
  const dev = await startDev(project, { port: 0, out: () => undefined })
  // The session is ended before the copy is removed, which a program that holds its files open would refuse.
  let closed = false
  t.after(async () => {
    if (!closed) await dev.close()
  })
  const [first, second] = await Promise.all([typed(project, 'map', '--json'), typed(project, 'map', '--json')])
  assert.equal(first.ended, 0, first.printed)
  assert.equal(second.ended, 0, second.printed)
  // One release build for the two calls, and the two answers alike.
  assert.equal(builds(), 1)
  assert.deepEqual(second.answer.value, first.answer.value)
  // The save that came while the release build was made is built after it, and the next map holds it, with the
  // bytes of a release build made anew for the files it changed.
  const after = await typed(project, 'map', '--json')
  assert.equal(after.ended, 0, after.printed)
  const names = Object(after.answer.value).lines.map((one: { name: string }) => one.name)
  assert.ok(names.includes('heldOrders'), after.printed)
  assert.equal(builds(), 2)
  await dev.close()
  closed = true
})

test('[55-8] an engine that runs on the data folder and is no session of forjr dev refuses the command map by its code and its fields, and the map is made from the files', async (t) => {
  const project = copied(t, 'map-started', 'mapShop')
  const built = await buildProject(project, { for: 'dev', out: join(project, '..', 'bundle') })
  assert.deepEqual(
    built.findings.filter((one) => one.level === 'error'),
    [],
  )
  const engine = createEngine({ port: 0 })
  let closed = false
  t.after(async () => {
    if (!closed) await engine.close()
  })
  await engine.open(built.bundleFolder, { dataFolder: join(project, '.forjr'), mode: 'development' })
  const refused = await askedOfRunning({ folder: project }, 'map', {})
  const [finding] = refused?.findings ?? []
  assert.equal(finding?.code, 'F0001', JSON.stringify(refused))
  assert.deepEqual(finding?.fields, { command: 'map' })
  const map = await typed(project, 'map', '--json')
  assert.equal(map.ended, 0, map.printed)
  assert.equal(Object(map.answer.value).page, 'built')
  await engine.close()
  closed = true
})
