import assert from 'node:assert/strict'
import { readFileSync, rmSync, existsSync, mkdirSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { ada, codeOf, described, filesIn, fingerprintOf, heldIn, pointOf, put, started, workFolder } from './work.ts'

const start = Date.UTC(2026, 9, 14)

test('[40-14a] a point holds no .git at any depth and in any case of its name, whatever leave names, and take refuses a path that holds one', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: start })
  const { project, history } = started(t, {
    'forjr.ts': 'project\n',
    '.git/HEAD': 'ref\n',
    '.GIT/config': 'settings\n',
    'kits/one/.git/HEAD': 'ref\n',
    'kits/one/kit.ts': 'kit\n',
    'kits/two/.git': 'gitdir: elsewhere\n',
    '.gitignore': '.forjr/\n',
  })
  // A project that states its own `leave` holds its packages, and still no `.git`.
  const point = history.record(project, {
    by: ada,
    kind: 'named',
    name: 'one',
    description: described({ history: { leave: ['*.log'] } }),
  })
  assert.deepEqual(Object.keys(point.files ?? {}), ['.gitignore', 'forjr.ts', 'kits/one/kit.ts'])

  const bytes = new TextEncoder().encode('a hook')
  const print = fingerprintOf(bytes)
  for (const path of ['.git/hooks/post-commit', '.GIT/config', 'kits/one/.git/HEAD', 'kits/.Git']) {
    const sent = pointOf({ parents: [], at: start, by: ada, kind: 'named', name: 'sent', files: { [path]: print } })
    assert.equal(
      codeOf(() => history.take({ blobs: { [print]: bytes }, points: [sent] })),
      'F9107',
      path,
    )
  }
})

test('[40-3a] going back that would write over a file that no point holds is refused with F0013, which names each such file, before anything is recorded or written', (t) => {
  const { project, history } = started(t, { 'forjr.ts': 'project\n', 'notes.log': 'old log', 'data.bin': 'small' })
  history.record(project, { by: ada, kind: 'named', name: 'old' })

  // From here on the project leaves its logs out, and `data.bin` is larger than a point holds.
  const rules = described({ history: { leave: ['*.log'] }, limits: { historyFileSize: 1024 } })
  put(project, 'notes.log', 'a log that no point holds')
  put(project, 'data.bin', 'x'.repeat(2000))
  put(project, 'forjr.ts', 'project, changed\n')
  history.record(project, { by: ada, kind: 'named', name: 'later', description: rules })
  const before = { files: heldIn(project), points: history.list().length, now: history.pointer('now') }

  let refusal: unknown
  try {
    history.back(project, 'old', ada)
  } catch (error) {
    refusal = error
  }
  assert.equal(Reflect.get(Object(refusal), 'code'), 'F0013')
  const said = String(Reflect.get(Object(refusal), 'message'))
  assert.match(said, /data\.bin/)
  assert.match(said, /notes\.log/)
  assert.deepEqual(heldIn(project), before.files, 'no file of the project changed')
  assert.equal(history.list().length, before.points, 'no point was recorded')
  assert.equal(history.pointer('now'), before.now)

  // With the two files moved away, going back is taken, and going forward again leaves them away.
  rmSync(join(project, 'notes.log'))
  rmSync(join(project, 'data.bin'))
  history.back(project, 'old', ada)
  assert.equal(Buffer.from(filesIn(project)['data.bin'], 'hex').toString(), 'small')
})

// Windows refuses these signs in the name of a file: https://learn.microsoft.com/windows/win32/fileio/naming-a-file
const unwritable = [
  'logs/10:30.log',
  'what?.txt',
  'a<b>.txt',
  'say"so".txt',
  'pipe|d.txt',
  'star*.txt',
  'back\\slash.txt',
]

test('[40-14a] a file whose name not every system holds is not kept, and the note of the point names it once: going back, comparing and writing work', {
  todo:
    process.platform === 'win32'
      ? 'Windows makes no file of such a name, so none can be planted: owed to Linux and macOS'
      : false,
}, (t) => {
  const planted = Object.fromEntries(unwritable.map((path) => [path, 'a file\n']))
  const { project, history } = started(t, { 'forjr.ts': 'project\n', 'kept.txt': 'kept\n', ...planted })
  const first = history.record(project, { by: ada, kind: 'named', name: 'first' })
  assert.deepEqual(Object.keys(first.files ?? {}), ['forjr.ts', 'kept.txt'])
  for (const path of unwritable)
    assert.equal((first.note ?? '').split(path).length - 1, 1, `the note names ${path} once`)
  put(project, 'kept.txt', 'changed\n')
  const second = history.record(project, { by: ada, kind: 'named', name: 'second' })
  assert.doesNotThrow(() => history.compare(first.id, second.id))
  history.back(project, first.id, ada)
  assert.equal(readFileSync(join(project, 'kept.txt'), 'utf8'), 'kept\n')
  const written = join(project, '..', 'written')
  history.write(first.id, written)
  assert.deepEqual(Object.keys(filesIn(written)).sort(), ['forjr.ts', 'kept.txt'])
})

test('[40-14a] take refuses a point that holds a file whose name not every system holds', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: start })
  const { history } = started(t)
  const bytes = new TextEncoder().encode('a file')
  const print = fingerprintOf(bytes)
  for (const path of unwritable) {
    const sent = pointOf({ parents: [], at: start, by: ada, kind: 'named', name: 'sent', files: { [path]: print } })
    assert.equal(
      codeOf(() => history.take({ blobs: { [print]: bytes }, points: [sent] })),
      'F9107',
      path,
    )
  }
})

test('[40-3a] going back writes over no file that the present point does not hold: a file that grew past historyFileSize since the older point keeps its bytes, or going back is refused', (t) => {
  const { project, history } = started(t, { 'forjr.ts': 'project\n', 'data.bin': 'small' })
  const rules = described({ limits: { historyFileSize: 1024 } })
  const old = history.record(project, { by: ada, kind: 'named', name: 'old', description: rules })
  assert.ok(old.files?.['data.bin'])

  // The file grows past the limit: no point holds it from here on, and its point names it in its note.
  const grown = 'x'.repeat(2000)
  put(project, 'data.bin', grown)
  put(project, 'forjr.ts', 'project, changed\n')
  const later = history.record(project, { by: ada, kind: 'named', name: 'later', description: rules })
  assert.equal(later.files?.['data.bin'], undefined)
  assert.match(later.note ?? '', /data\.bin/)

  // "Going back can itself be undone" and "a file that no point holds is never touched" (`40`, section 2, going back).
  let refused = false
  try {
    history.back(project, 'old', ada)
  } catch {
    refused = true
  }
  if (!refused) history.back(project, 'later', ada)
  const left = existsSync(join(project, 'data.bin')) ? readFileSync(join(project, 'data.bin'), 'utf8').length : 0
  assert.equal(left, grown.length, 'the bytes that no point holds are gone after going back and forward again')
})

test('[16-2@7d] [40-14a] take refuses a path that leads into the engine own folder under another case of its name', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: start })
  const { history } = started(t)
  const bytes = new TextEncoder().encode('a file')
  const print = fingerprintOf(bytes)
  // Windows and macOS find `.forjr` under each of these: a point that holds one writes into the engine's own folder.
  for (const path of ['.FORJR/history.db', '.Forjr/dev/data.db']) {
    const point = pointOf({ parents: [], at: start, by: ada, kind: 'named', name: 'sent', files: { [path]: print } })
    assert.equal(
      codeOf(() => history.take({ blobs: { [print]: bytes }, points: [point] })),
      'F9107',
      path,
    )
  }
})

test('[40-3a] going back writes no file through a link that stands in the folder of the project: what lies outside the project is untouched', (t) => {
  const { project, history } = started(t, { 'forjr.ts': 'project\n', 'shared/notes.txt': 'old notes' })
  const old = history.record(project, { by: ada, kind: 'named', name: 'old' })
  assert.ok(old.files?.['shared/notes.txt'])

  // The folder is moved out of the project, and a link stands in its place: a link is no file of the folder, and
  // no point holds what lies behind it.
  const outside = join(workFolder(t), 'outside')
  mkdirSync(outside, { recursive: true })
  rmSync(join(project, 'shared'), { recursive: true })
  writeFileSync(join(outside, 'notes.txt'), 'notes of another program')
  try {
    symlinkSync(outside, join(project, 'shared'), 'junction')
  } catch (error) {
    t.diagnostic(
      `a link could not be made here, so it was not tried: ${error instanceof Error ? error.message : error}`,
    )
    return
  }
  const later = history.record(project, { by: ada, kind: 'named', name: 'later' })
  assert.equal(later.files?.['shared/notes.txt'], undefined, 'no point holds what lies behind a link')

  try {
    history.back(project, 'old', ada)
  } catch {
    // A refusal leaves everything as it was, which is right too.
  }
  assert.equal(readFileSync(join(outside, 'notes.txt'), 'utf8'), 'notes of another program')
})

test('[40-14a] a point holds no file of the git repository that the folder of the project is: going back leaves .git as it was', (t) => {
  // `40`, section 2, point 9: a project "may lie inside a git repository of the builder's own".
  const { project, history } = started(t, { 'forjr.ts': 'project\n', '.git/HEAD': 'ref: refs/heads/main\n' })
  put(project, '.git/refs/heads/main', '1111111111111111111111111111111111111111\n')
  history.record(project, { by: ada, kind: 'named', name: 'old' })

  // The builder commits with git: the branch moves, and an object is added.
  put(project, '.git/refs/heads/main', '2222222222222222222222222222222222222222\n')
  put(project, '.git/objects/22/22222222222222222222222222222222222222', 'a commit')
  put(project, 'forjr.ts', 'project, changed\n')
  history.record(project, { by: ada, kind: 'named', name: 'later' })

  history.back(project, 'old', ada)
  assert.equal(heldIn(project)['forjr.ts'], Buffer.from('project\n').toString('hex'))
  assert.equal(
    readFileSync(join(project, '.git/refs/heads/main'), 'utf8'),
    '2222222222222222222222222222222222222222\n',
    'going back moved a branch of git',
  )
  assert.ok(
    existsSync(join(project, '.git/objects/22/22222222222222222222222222222222222222')),
    'a commit of git is gone',
  )
})

test('[40-14a] exportGit writes no file of a point into the .git folder of the export: a hook and a setting that a point holds are no hook and no setting of the export', (t) => {
  const { project, history } = started(t, { 'forjr.ts': 'project\n' })
  put(project, '.git/hooks/post-commit', '#!/bin/sh\necho ran > "$(git rev-parse --show-toplevel)/hook-ran.txt"\n')
  put(project, '.git/config', '[core]\n\tmarker = of-the-point\n')
  history.record(project, { by: ada, kind: 'named', name: 'first' })
  const out = join(workFolder(t), 'export')
  try {
    history.exportGit(out)
  } catch {
    // An export that refuses such a point writes nothing of it, which is right too.
  }
  assert.ok(!existsSync(join(out, '.git', 'hooks', 'post-commit')), 'the export holds a hook that a point brought')
  const config = existsSync(join(out, '.git', 'config')) ? readFileSync(join(out, '.git', 'config'), 'utf8') : ''
  assert.doesNotMatch(config, /of-the-point/, 'the settings of the export are those of a point')
  assert.ok(!readdirSync(out).includes('hook-ran.txt'), 'a hook that a point brought was carried out')
})
