import assert from 'node:assert/strict'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { startDev } from '../../../parts/cli/dev.ts'
import { copied, typed } from '../../../parts/cli/tests/typed.ts'

/** Has the system's folder for temporary files be an empty folder of the test while it runs, and answers it. */
function emptyTemp(t: TestContext, project: string): string {
  const temp = join(project, '..', 'temp')
  mkdirSync(temp)
  const was = ['TEMP', 'TMP', 'TMPDIR'].map((name) => [name, process.env[name]] as const)
  for (const [name] of was) process.env[name] = temp
  t.after(() => {
    for (const [name, value] of was)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
  })
  return temp
}

/** Every file and folder under a folder, by its path there, in the order of the paths. */
const treeOf = (folder: string): string[] =>
  readdirSync(folder, { recursive: true, withFileTypes: true })
    .map(
      (one) =>
        `${join(one.parentPath, one.name)
          .slice(folder.length + 1)
          .replaceAll('\\', '/')}`,
    )
    .sort()

/** The bytes of the page that a map answers: of the style files every page loads, and of each line that has some. */
const bytesOf = (value: unknown): unknown => ({
  styles: Object(value).styles,
  lines: Object(value)
    .lines.filter((one: { browser?: object }) => one.browser !== undefined)
    .map((one: { name: string; browser: object }) => [one.name, one.browser]),
})

test("[55-8] forjr map of a project with screens and style files leaves nothing in the project but the build's own cache, and nothing in the folder for temporary files", async (t) => {
  const project = copied(t, 'review13-left', 'review13Bytes')
  const temp = emptyTemp(t, project)
  // The project as the build leaves it: a first build writes its own type list beside the code.
  const described = await typed(project, 'map', 'notes.body')
  assert.equal(described.ended, 0, described.printed)
  const before = treeOf(project)
  const map = await typed(project, 'map', '--json')
  assert.equal(map.ended, 0, map.printed)
  const value = Object(map.answer.value)
  assert.equal(value.page, 'built')
  assert.ok(Object.keys(value.styles ?? {}).length > 0, map.printed)
  const home = value.lines.find((one: { name: string }) => one.name === 'homeScreen')
  assert.ok(Number(home?.browser?.bytes) > 0, map.printed)
  const one = await typed(project, 'map', 'homeScreen', '--json')
  assert.equal(one.ended, 0, one.printed)
  assert.deepEqual(readdirSync(temp), [])
  // A release build made for the map writes nothing into the project but the build's own cache, `.forjr/cache/`, which
  // every build keeps (the keeper's ruling): no bundle and no module of the release.
  const kept = (paths: string[]): string[] => paths.filter((one) => !/^\.forjr\/cache(?:\/|$)/.test(one))
  assert.deepEqual(kept(treeOf(project)), kept(before))
})

test('[55-8] with forjr dev running, the bytes of the page of a project with screens and style files are those the command answers with no session', async (t) => {
  const project = copied(t, 'review13-session', 'review13Bytes')
  const dev = await startDev(project, { port: 0, out: () => undefined })
  let closed = false
  t.after(async () => {
    if (!closed) await dev.close()
  })
  const session = await typed(project, 'map', '--json')
  assert.equal(session.ended, 0, session.printed)
  const sessionOne = await typed(project, 'map', 'homeScreen', '--json')
  assert.equal(sessionOne.ended, 0, sessionOne.printed)
  await dev.close()
  closed = true
  const made = await typed(project, 'map', '--json')
  assert.equal(made.ended, 0, made.printed)
  assert.ok(Object.keys(Object(made.answer.value).styles ?? {}).length > 0, made.printed)
  assert.deepEqual(bytesOf(session.answer.value), bytesOf(made.answer.value))
  const madeOne = await typed(project, 'map', 'homeScreen', '--json')
  assert.ok(Object.keys(Object(madeOne.answer.value).line?.browser?.files ?? {}).length > 0, madeOne.printed)
  assert.deepEqual(Object(sessionOne.answer.value).line.browser, Object(madeOne.answer.value).line.browser)
})

test('[55-7] a word that names a file outside the project, by a path that climbs or by its whole path, is F0001 and reads nothing of it', async (t) => {
  const project = copied(t, 'review13-outside', 'review13Bytes')
  const outside = join(project, '..', 'outside.ts')
  writeFileSync(outside, "import { query } from 'forjr'\n\nexport const outsideSecret = query('outsideSecret', {})\n")
  for (const word of ['../outside.ts', outside.replaceAll('\\', '/'), 'functions/../../outside.ts']) {
    const map = await typed(project, 'map', word, '--json')
    assert.notEqual(map.ended, 0, `${word}: ${map.printed}`)
    assert.ok(
      (map.answer.findings ?? []).some((one) => one.code === 'F0001'),
      `${word}: ${map.printed}`,
    )
    assert.doesNotMatch(map.printed, /outsideSecret/, word)
  }
})
