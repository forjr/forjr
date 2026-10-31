import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { tokenCount } from '../../../parts/core/internal.ts'
import { typed } from '../../../parts/cli/tests/typed.ts'

const root = join(import.meta.dirname, '..', '..', '..')

/**
 * Lays a copy of the orders example under a folder of `results/` that holds its packages, installed from its lock
 * and kept between runs as long as the lock stays the same, and answers the copy. The copy holds no packages of its
 * own: it finds those of the folder above it.
 */
function ordersLaid(t: { after: (done: () => void) => void }): string {
  const example = join(root, 'examples', 'orders')
  const folder = join(root, 'results', 'cli', 'packages-orders')
  const lock = readFileSync(join(example, 'package-lock.json'), 'utf8')
  const done = join(folder, 'node_modules', '.package-lock.json')
  const kept = existsSync(done) && existsSync(join(folder, 'package-lock.json'))
  if (!kept || readFileSync(join(folder, 'package-lock.json'), 'utf8') !== lock) {
    mkdirSync(folder, { recursive: true })
    copyFileSync(join(example, 'package.json'), join(folder, 'package.json'))
    writeFileSync(join(folder, 'package-lock.json'), lock)
    // The npm that the runtime came with lies beside it on Windows, and under `lib/` elsewhere.
    const npm = [
      join(dirname(process.execPath), 'node_modules'),
      join(dirname(process.execPath), '..', 'lib', 'node_modules'),
    ]
      .map((one) => join(one, 'npm', 'bin', 'npm-cli.js'))
      .find((path) => existsSync(path))
    assert.ok(npm, 'no npm lies beside the runtime')
    const ended = spawnSync(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: folder,
      encoding: 'utf8',
      timeout: 300_000,
    })
    assert.equal(ended.status, 0, ended.stderr)
  }
  const copy = join(folder, 'map-orders')
  const remove = (): void => rmSync(copy, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  remove()
  t.after(remove)
  cpSync(example, copy, {
    recursive: true,
    filter: (path) => !['node_modules', '.forjr'].some((one) => path.includes(one)),
  })
  return copy
}

interface Line {
  name: string
  kind: string
  file?: string
  line?: number
  rule?: string
  doors: string[]
  browser?: { bytes?: number; files?: Record<string, number> }
  weight: number
}

test('[55-6] forjr map of the orders example holds every definition with its file and line, its rule, its doors, its edges and its bytes, the heaviest first, cut to its size', async (t) => {
  const project = ordersLaid(t)
  const all = await typed(project, 'map', '--all', '--json')
  assert.equal(all.ended, 0, all.printed)
  const map = Object(all.answer.value)
  assert.equal(map.page, 'built')
  assert.equal(map.more, 0)
  const lines: Line[] = map.lines
  const byName = new Map(lines.map((one) => [`${one.kind} ${one.name}`, one]))

  // Every definition of every kind, with its file and line where the description places it.
  const built = await typed(project, 'build', '--json')
  assert.equal(built.ended, 0, built.printed)
  const bundle = String(Object(built.answer.value).bundle)
  const description = JSON.parse(readFileSync(join(bundle, 'description.json'), 'utf8'))
  const names = new Set(lines.map((one) => one.name))
  for (const part of ['tables', 'functions', 'flows', 'screens', 'components', 'services', 'models', 'routes'])
    for (const name of Object.keys(description[part] ?? {})) assert.ok(names.has(name), `${part} ${name}`)
  for (const [name, place] of Object.entries<{ file: string }>(description.places)) {
    const line = lines.find((one) => one.name === name)
    if (!line) continue
    assert.equal(line.file, place.file, name)
    assert.ok(Number(line.line) > 0, name)
  }
  // Its rule in words and its doors.
  assert.equal(byName.get('query ordersByStatus')?.rule, 'role staff')
  assert.equal(byName.get('table orders')?.rule, 'read the owner of the row, change the owner of the row')
  assert.ok(byName.get('screen ordersScreen')?.doors.includes('/orders'))
  // The heaviest first.
  const weights = lines.map((one) => one.weight)
  assert.deepEqual(
    weights,
    [...weights].sort((a, b) => b - a),
  )

  // The bytes of each package that reaches a browser, of each file of a screen in the release bundle, and of the
  // style files every page loads on the first line.
  const browser = description.browser
  for (const [name, used] of Object.entries<{ browser: boolean; bytes?: number }>(description.packages ?? {}))
    if (used.browser) assert.equal(byName.get(`package ${name}`)?.browser?.bytes, used.bytes ?? 0, name)
  const orders = byName.get('screen ordersScreen')
  const files: string[] = browser.screens.ordersScreen
  assert.deepEqual(
    orders?.browser?.files,
    Object.fromEntries(files.map((file) => [file, statSync(join(bundle, file)).size])),
  )
  assert.equal(
    orders?.browser?.bytes,
    files.reduce((sum, file) => sum + statSync(join(bundle, file)).size, 0),
  )
  const text = (await typed(project, 'map')).printed
  const styles: string[] = browser.styles ?? []
  const first = text.split('\n')[0]
  if (styles.length)
    assert.match(
      first,
      new RegExp(`browser styles ${styles.reduce((sum, file) => sum + statSync(join(bundle, file)).size, 0)} bytes`),
    )
  else assert.doesNotMatch(first, /browser styles/)
  // An edge seen in code carries ~, and a definition whose code may reach more ends with code.
  assert.match(text, /^screen ordersScreen {2}.* {2}code$/m)
  assert.match(text, /~/)

  // Within 1,500 tokens, or saying how many were left out; --size changes the cut; one build gives one text.
  const told = text.split('\n')
  const more = /^(\d+) more: forjr map --all, or forjr map <name>$/.exec(told.at(-1) ?? '')
  assert.ok(tokenCount((more ? told.slice(0, -1) : told).join('\n')) <= 1500)
  assert.equal(Number(more?.[1] ?? 0), lines.length - (told.length - 2 - (more ? 1 : 0)))
  const small = Object((await typed(project, 'map', '--size', '300', '--json')).answer.value)
  assert.ok(small.lines.length < told.length - 2)
  assert.equal(small.more, lines.length - small.lines.length)
  assert.equal((await typed(project, 'map')).printed, text)
})
