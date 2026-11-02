import assert from 'node:assert/strict'
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { TestContext } from 'node:test'
import { test } from 'node:test'
import { testApp } from '../../../parts/test/index.ts'
import { root, typed } from '../../../parts/cli/tests/typed.ts'

/** An empty folder of a test under `results/`, removed when the test ends. */
function workFolder(t: TestContext, name: string): string {
  const folder = join(root, 'results', 'cli', name)
  const remove = (): void => rmSync(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 })
  remove()
  mkdirSync(folder, { recursive: true })
  t.after(remove)
  return folder
}

/** Every file under a folder, by its path from the folder written with `/`, but those of the folders it skips. */
function filesUnder(folder: string, skip: (path: string) => boolean = () => false): string[] {
  const found: string[] = []
  const walk = (at: string): void => {
    for (const name of readdirSync(at)) {
      const path = join(at, name)
      const written = relative(folder, path).split('\\').join('/')
      if (skip(written)) continue
      if (statSync(path).isDirectory()) walk(path)
      else found.push(written)
    }
  }
  walk(folder)
  return found.sort()
}

test('[43-1] forjr new writes a bare project - forjr.ts, package.json, AGENTS.md, the icon of its site, one screen at / and one query it reads, and nothing else - and the check passes on it', async (t) => {
  const folder = workFolder(t, 'new-bare')
  const made = await typed(folder, 'new', 'my-app', '--json')
  assert.equal(made.ended, 0, made.printed)
  const project = join(folder, 'my-app')
  // The engine's own folder holds the first point of the history, and is no file of the project.
  const files = filesUnder(project, (path) => path === '.forjr')
  // `.gitignore` keeps the engine's own folder, with the data and the key of the secrets, out of a shared repository.
  assert.deepEqual(files, [
    '.gitignore',
    'AGENTS.md',
    'assets/icon.svg',
    'forjr.ts',
    'functions/greeting.ts',
    'package.json',
    'screens/home.tsx',
  ])
  assert.deepEqual(Object(made.answer.value).files, files)

  const checked = await typed(project, 'check', '--json')
  assert.equal(checked.ended, 0, checked.printed)
  assert.deepEqual(checked.answer.findings, [])
  // One screen at `/`, which reads the one query, and no other definition but the project.
  const definitions: Record<string, string> = Object(Object(checked.answer.value).definitions)
  assert.deepEqual(Object.keys(definitions).sort(), ['greeting', 'homeScreen', 'myApp'])
  const screen = readFileSync(join(project, 'screens', 'home.tsx'), 'utf8')
  assert.match(screen, /path: '\/',/)
  assert.match(screen, /read\(greeting\)/)

  // The screen draws what the query answers, for a visitor, with nothing else made.
  const app = await testApp({ folder: project })
  t.after(() => app.close())
  const page = await app.as('nobody').page('/')
  assert.equal(page.status, 200)
  const answer = String(await app.as('nobody').call('greeting'))
  assert.ok(answer.length > 0)
  assert.ok(page.html.includes(answer), page.html)
  // The site's icon is the mark of Forjr, a dash and a dot, until the project names its own.
  assert.match(page.html, /<link rel="icon" href="[^"]+">/)
  const icon = readFileSync(join(project, 'assets', 'icon.svg'), 'utf8')
  assert.ok(icon.includes('<rect width="23" height="10" rx="5"/><circle cx="32.5" cy="5" r="5"/>'), icon)
})

test('[43-1] the .gitignore of forjr new leaves out the engine folder, the packages, the made type list, and results/, where a failed step of a test keeps what its page held', async (t) => {
  const folder = workFolder(t, 'new-ignored')
  const made = await typed(folder, 'new', 'my-app', '--json')
  assert.equal(made.ended, 0, made.printed)
  const ignored = readFileSync(join(folder, 'my-app', '.gitignore'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .sort()
  assert.deepEqual(ignored, ['.forjr/', 'forjr.d.ts', 'node_modules/', 'results/'])
})

test('[43-1] forjr new . makes the project in the folder it is typed in, named after it, beside its hidden entries, and refuses one that holds a file', async (t) => {
  const folder = join(workFolder(t, 'new-here'), 'my-app')
  mkdirSync(join(folder, '.git'), { recursive: true })
  const made = await typed(folder, 'new', '.', '--json')
  assert.equal(made.ended, 0, made.printed)
  assert.equal(Object(made.answer.value).folder, '.')
  assert.equal(JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8')).name, 'my-app')
  assert.ok(readdirSync(join(folder, '.git')).length === 0, 'the hidden entry stays as it was')

  const held = join(folder, '..', 'held')
  mkdirSync(held)
  writeFileSync(join(held, 'notes.txt'), 'mine')
  const refused = await typed(held, 'new', '.', '--json')
  assert.notEqual(refused.ended, 0)
  assert.match(refused.printed, /The folder held is there, and holds files\./)
  assert.deepEqual(readdirSync(held), ['notes.txt'])
})

test('[43-1] forjr copy is no command, and forjr new takes no --with', async (t) => {
  const folder = workFolder(t, 'new-no-with')
  const copy = await typed(folder, 'copy', 'signIn', '--json')
  assert.notEqual(copy.ended, 0)
  assert.match(String(copy.answer.findings?.[0]?.message), /forjr has no command "copy"/)
  const withOne = await typed(folder, 'new', 'my-app', '--with', 'signIn', '--json')
  assert.notEqual(withOne.ended, 0)
  assert.match(String(withOne.answer.findings?.[0]?.message), /forjr new takes no --with/)
  // A refused command makes no project.
  assert.deepEqual(readdirSync(folder), [])
})
