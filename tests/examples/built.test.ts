import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import test from 'node:test'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(import.meta.dirname, '..', '..')
// In this repository the command `forjr` is this file, run by the pinned runtime.
const shell = join(root, 'parts', 'cli', 'shell.ts')

// Every app among the examples, by its folder.
const apps = [
  'examples/orders',
  'examples/marketing-site',
  'examples/help-desk',
  'examples/bots',
  'examples/app-builder/product',
]

/**
 * Copies the example that holds an app into a folder of its own under the folder that git leaves out, without what
 * an install or a build left in it, and answers the folder of the app in the copy. The walks of the examples install
 * and build in the examples themselves: two installs into one folder at once leave a package half written.
 */
function copied(t: { after: (done: () => void) => void }, app: string): string {
  const [, example] = app.split('/')
  const all = join(root, 'results', 'examples')
  mkdirSync(all, { recursive: true })
  const folder = mkdtempSync(join(all, `${example}-`))
  t.after(() => rmSync(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }))
  const from = join(root, 'examples', example)
  cpSync(from, join(folder, example), {
    recursive: true,
    filter: (path) =>
      !relative(from, path)
        .split(sep)
        .some((name) => name === 'node_modules' || name === '.forjr'),
  })
  return join(folder, ...app.split('/').slice(1))
}

/** Installs the packages of an app from its lock, where it holds one. */
async function packagesOf(folder: string): Promise<void> {
  if (!existsSync(join(folder, 'package-lock.json'))) return
  // The npm that the runtime came with lies beside it on Windows, and under `lib/` elsewhere.
  const npm = [
    join(dirname(process.execPath), 'node_modules'),
    join(dirname(process.execPath), '..', 'lib', 'node_modules'),
  ]
    .map((one) => join(one, 'npm', 'bin', 'npm-cli.js'))
    .find((path) => existsSync(path))
  assert.ok(npm, 'npm lies beside the runtime')
  await run(process.execPath, [npm, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: folder })
}

/** Runs `forjr` with words and `--json` in a folder, and answers what it printed as its answer. */
async function forjr(folder: string, words: string[]): Promise<{ ok: boolean; value: Record<string, unknown> }> {
  const { NODE_TEST_CONTEXT: _, ...env } = process.env
  const said = await run(process.execPath, [shell, ...words, '--json'], { cwd: folder, env, maxBuffer: 1 << 26 }).catch(
    (error: { stdout?: string; message: string }) => ({ stdout: error.stdout || error.message }),
  )
  return JSON.parse(said.stdout)
}

for (const app of apps)
  test(`[58-8] ${app} is checked and built under Forjr: its description is written as forjr.description/2`, async (t) => {
    const folder = copied(t, app)
    await packagesOf(folder)
    const checked = await forjr(folder, ['check'])
    assert.equal(checked.ok, true, JSON.stringify(checked).slice(0, 2000))
    const built = await forjr(folder, ['build', '--out', join(folder, '..', 'bundle')])
    assert.equal(built.ok, true, JSON.stringify(built).slice(0, 2000))
    const bundle = String(built.value.bundle)
    const description = JSON.parse(readFileSync(join(bundle, 'description.json'), 'utf8'))
    assert.equal(description.format, 'forjr.description/2')
    assert.match(readFileSync(join(folder, 'forjr.ts'), 'utf8'), /from 'forjr'/)
  })
