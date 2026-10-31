import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { recordedCopy, tested } from './recordedProject.ts'
import { anotherHost, outsideCopy, testedNow } from './outsideHost.ts'

/** The tests that a run printed as text, each with how it stands: `passed`, `failed` or `replayed`. */
function linesOf(printed: string): Record<string, string> {
  const lines: Record<string, string> = {}
  for (const line of printed.split('\n')) {
    const found = /^(passed|failed|replayed) (.+)$/.exec(line.trim())
    if (found) lines[found[2]] = found[1]
  }
  return lines
}

/** What `.forjr/tests.json` keeps of one test, by its file and its name. */
function keptOf(project: string, file: string, name: string): { outside?: string[] } {
  const record = JSON.parse(readFileSync(join(project, '.forjr', 'tests.json'), 'utf8'))
  const kept = record.tests?.[file]?.[name]?.[0]
  assert.ok(kept, `${file}: ${name} is kept`)
  return kept
}

/** Changes a file of a project by one replacement, which must take. */
function changed(project: string, path: string, from: string, to: string): void {
  const file = join(project, path)
  const text = readFileSync(file, 'utf8')
  assert.ok(text.includes(from), `${path} holds ${from}`)
  writeFileSync(file, text.replace(from, to))
}

/** A first run, which must pass, then the change, then a second run: answers what the second printed of each test. */
function againAfter(project: string, change: () => void): { lines: Record<string, string>; printed: string } {
  const first = tested(project)
  assert.equal(first.ended, 0, first.printed)
  change()
  const second = tested(project)
  return { lines: linesOf(second.printed), printed: second.printed }
}

test('[53-3] a change of a file that a test file imports as it runs runs that test again', (t) => {
  const project = recordedCopy(t, 'recorded-imported', 'recordedOver/imported')
  const { lines, printed } = againAfter(project, () => changed(project, 'lib/said.ts', "said = 'one'", "said = 'two'"))
  assert.equal(lines['tests/imported.test.ts: a word the test file imports as it runs'], 'failed', printed)
})

test('[53-5] a test that reads a fixture through require is never replayed, as one that reads it through node:fs is not', (t) => {
  const project = recordedCopy(t, 'recorded-required', 'recordedOver/required')
  const { lines, printed } = againAfter(project, () => changed(project, 'tests/fixture.json', '"one"', '"two"'))
  assert.equal(lines['tests/required.test.ts: a fixture the test file reads through require'], 'failed', printed)
})

test('[53-3] a test whose function reads a word of the environment runs again where that word changed', (t) => {
  const project = recordedCopy(t, 'recorded-env', 'recordedOver/env')
  process.env.RECORDED_WORD = 'one'
  t.after(() => {
    delete process.env.RECORDED_WORD
  })
  const { lines, printed } = againAfter(project, () => {
    process.env.RECORDED_WORD = 'two'
  })
  assert.equal(lines['tests/env.test.ts: a word of the environment the code of a function reads'], 'failed', printed)
})

test('[53-5] a test that makes a plain fetch of its own reached outside, and is never replayed', (t) => {
  const project = recordedCopy(t, 'recorded-fetched', 'recordedOver/fetched')
  const { lines, printed } = againAfter(project, () => undefined)
  const name = 'a test that makes a plain fetch of its own'
  assert.ok(keptOf(project, 'tests/fetched.test.ts', name).outside?.length, 'the fetch of the test is kept as outside')
  assert.equal(lines[`tests/fetched.test.ts: ${name}`], 'passed', printed)
})

test('[53-5] a test that goes on with the app an earlier test of its file opened shares its data, and is never replayed alone', (t) => {
  const project = recordedCopy(t, 'recorded-shared', 'recordedOver/shared')
  const { lines, printed } = againAfter(project, () =>
    changed(project, 'functions/add.ts', "title: input('title')", "title: 'Another'"),
  )
  assert.equal(lines['tests/shared.test.ts: the second test reads what the first one added'], 'failed', printed)
})

test('[53-3] a test inside a group that bears the name of a replayed test still runs where what it touched changed', (t) => {
  const project = recordedCopy(t, 'recorded-grouped', 'recordedOver/grouped')
  const { lines, printed } = againAfter(project, () =>
    changed(project, 'functions/open.ts', 'where({ paid: false })', 'where({ paid: false, title: "none" })'),
  )
  assert.equal(lines['tests/grouped.test.ts: open orders inside a group'], 'passed', printed)
})

test('[53-5] a test whose page loads a picture from another host, and one whose code asks another host by node:http, reached outside and are never replayed', async (t) => {
  const host = await anotherHost(t)
  const project = outsideCopy(t, 'recorded-outside', host.at)
  const first = await testedNow(project)
  assert.equal(first.ended, 0, first.printed)
  // Each request truly left the program for the other host.
  assert.ok(host.asked.includes('/picture'), JSON.stringify(host.asked))
  assert.ok(host.asked.includes('/http'), JSON.stringify(host.asked))
  const second = await testedNow(project)
  const lines = linesOf(second.printed)
  assert.deepEqual(
    [
      lines['tests/pictured.test.ts: a page whose picture comes from another host'],
      lines['tests/http.test.ts: a function whose code asks another host by node:http'],
    ],
    ['passed', 'passed'],
    second.printed,
  )
})

/** A run with a word of the environment set to a value, and the word taken away again after it. */
function testedWith(project: string, word: string, ...words: string[]): ReturnType<typeof tested> {
  process.env.RECORDED_WORD = word
  try {
    return tested(project, ...words)
  } finally {
    delete process.env.RECORDED_WORD
  }
}

/** Two runs, the first with the word `one`, which must pass, and the second with `two`: what the second printed. */
function wordChanged(project: string, ...words: string[]): { lines: Record<string, string>; printed: string } {
  const first = testedWith(project, 'one', ...words)
  assert.equal(first.ended, 0, first.printed)
  const second = testedWith(project, 'two', ...words)
  return { lines: linesOf(second.printed), printed: second.printed }
}

test('[53-3] a test whose function reads a word of the environment from a copy of the whole environment runs again where that word changed', (t) => {
  const project = recordedCopy(t, 'recorded-env-copied', 'recordedOver/envCopied')
  const { lines, printed } = wordChanged(project)
  const name = 'tests/envCopied.test.ts: a word of the environment the code of a function reads from a copy of it'
  assert.equal(lines[name], 'failed', printed)
})

test('[53-3] a test whose function reads a word of the environment through a package runs again where that word changed', (t) => {
  const project = recordedCopy(t, 'recorded-env-packaged', 'recordedOver/envPackaged')
  const folder = join(project, 'node_modules', 'recorded-word')
  mkdirSync(folder, { recursive: true })
  writeFileSync(
    join(folder, 'package.json'),
    JSON.stringify({ name: 'recorded-word', version: '1.0.0', type: 'module', exports: './index.js' }),
  )
  writeFileSync(join(folder, 'index.js'), "export const word = () => process.env.RECORDED_WORD ?? 'none'\n")
  const { lines, printed } = wordChanged(project)
  const name = 'tests/envPackaged.test.ts: a word of the environment a package reads for the code of a function'
  assert.equal(lines[name], 'failed', printed)
})

test('[53-3] a test whose action reads a word of the environment in the test room runs again where that word changed', (t) => {
  const project = recordedCopy(t, 'recorded-env-apart', 'recordedOver/envAction')
  const { lines, printed } = wordChanged(project, '--room', 'apart')
  assert.equal(
    lines['tests/envAction.test.ts: a word of the environment the code of an action reads'],
    'failed',
    printed,
  )
})

test('[53-17] a page that clears what it keeps for the tab and loads again draws ids of its calls that no document before drew', (t) => {
  const project = recordedCopy(t, 'recorded-storage', 'recordedOver/storage')
  const ran = tested(project, 'tests/storage.test.ts')
  assert.equal(ran.ended, 0, ran.printed)
})

test('[53-5] a test that reads a file of the project through a program it starts reached outside, and is never replayed', (t) => {
  const project = recordedCopy(t, 'recorded-started', 'recordedOver/started')
  const first = tested(project)
  assert.equal(first.ended, 0, first.printed)
  writeFileSync(join(project, 'data.txt'), 'two\n')
  const second = tested(project)
  const name = 'tests/started.test.ts: a test that reads a file of the project through a program it starts'
  assert.equal(linesOf(second.printed)[name], 'failed', second.printed)
})

test('[53-3] a test that held a page to what a reader of the screen hears runs again where the kept text changed', (t) => {
  const project = recordedCopy(t, 'recorded-heard', 'recordedOver/heard')
  const kept = join(project, 'tests', 'heard', 'chromium', 'home.txt')
  // The first run keeps nothing yet: what it heard is written beside, and kept as a person keeps it.
  const unkept = tested(project)
  assert.equal(unkept.ended, 1, unkept.printed)
  renameSync(kept.replace(/\.txt$/, '.new.txt'), kept)
  const first = tested(project)
  assert.equal(first.ended, 0, first.printed)
  writeFileSync(kept, `${readFileSync(kept, 'utf8')}\nA line that the page does not say`)
  const second = tested(project)
  const name = 'tests/heard.test.ts: the home screen sounds as it was kept'
  assert.equal(linesOf(second.printed)[name], 'failed', second.printed)
})

test('[53-3] a test that held a page to a kept picture runs again where the picture was kept anew while the run went on', (t) => {
  const project = recordedCopy(t, 'recorded-looked', 'recordedOver/looked')
  const kept = join(project, 'tests', 'looks', 'chromium', 'home.png')
  const unkept = tested(project)
  assert.equal(unkept.ended, 1, unkept.printed)
  renameSync(kept.replace(/\.png$/, '.new.png'), kept)
  // The test passes, and the picture is kept anew after it was held to it, while the run goes on.
  const first = tested(project)
  assert.equal(first.ended, 0, first.printed)
  const second = tested(project)
  const name = 'tests/looked.test.ts: the home screen looks as it was kept'
  assert.equal(linesOf(second.printed)[name], 'failed', second.printed)
})

test('[53-5] a test whose function connects to another host by WebSocket reached outside, and is never replayed', async (t) => {
  const host = await anotherHost(t)
  const project = recordedCopy(t, 'recorded-socket', 'recordedOver/socket')
  writeFileSync(join(project, 'lib', 'at.ts'), `export const socketAt = '${host.at.replace('http', 'ws')}/socket'\n`)
  const first = await testedNow(project)
  assert.equal(first.ended, 0, first.printed)
  assert.ok(host.asked.includes('/socket'), JSON.stringify(host.asked))
  const second = await testedNow(project)
  const name = 'tests/socket.test.ts: a function whose code connects to another host by WebSocket'
  assert.equal(linesOf(second.printed)[name], 'passed', second.printed)
})

test('[53-14] no generated case reaches outside: code that connects to another host by WebSocket is held', async (t) => {
  const host = await anotherHost(t)
  const project = recordedCopy(t, 'recorded-socket-declared', 'recordedOver/socket')
  rmSync(join(project, 'tests'), { recursive: true, force: true })
  writeFileSync(join(project, 'lib', 'at.ts'), `export const socketAt = '${host.at.replace('http', 'ws')}/socket'\n`)
  const ran = await testedNow(project, '--declared')
  assert.match(ran.printed, /socketOut - access/, ran.printed)
  assert.deepEqual(host.asked, [])
})
