import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkProject } from '../../../parts/check/index.ts'
import { ForjrError } from '../../../parts/core/index.ts'
import { codes } from '../../../parts/core/internal.ts'
import { findPage, pageNames } from '../../../parts/docs/index.ts'
import { testApp } from '../../../parts/test/index.ts'

const root = join(import.meta.dirname, '..', '..', '..')

// The numbers of the codes as the registry held them before their letter changed, sorted and joined by commas: a
// code keeps its number, so none is added, lost or moved by the change of the letter.
const numbersBefore = { count: 190, fingerprint: 'fff8f1baf735e82ab4a932375d3f08cd9bf976f43aced1dd013533b8ea56546d' }

/** A folder of the test under the folder that git leaves out, removed when the test ends. */
function workFolder(t: { after: (done: () => void) => void }): string {
  const all = join(root, 'results', 'test')
  mkdirSync(all, { recursive: true })
  const folder = mkdtempSync(join(all, 'letter-'))
  t.after(() => rmSync(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }))
  return folder
}

test('[58-3] each code of the registry is F and four digits, with the numbers it had before, and each has its page code.F<number>.md', () => {
  const held = Object.keys(codes)
  for (const code of held) assert.match(code, /^F\d{4}$/, `${code} is written with the letter F`)
  const numbers = held
    .map((code) => code.slice(1))
    .sort()
    .join(',')
  assert.deepEqual(
    { count: held.length, fingerprint: createHash('sha256').update(numbers).digest('hex') },
    numbersBefore,
    'the numbers of the codes are the ones they had',
  )
  const pages = new Set(pageNames())
  for (const code of held) {
    assert.ok(pages.has(`code.${code}`), `${code} has its page`)
    assert.ok(existsSync(join(root, 'parts', 'docs', 'pages', `code.${code}.md`)), `the page of ${code} is its file`)
    assert.match(findPage(`code.${code}`)?.text ?? '', new RegExp(`^# ${code} `), `the page of ${code} names it`)
  }
})

test('[58-3] a finding of the check and a refused call name their code with the letter F', async (t) => {
  const folder = join(workFolder(t), 'project')
  cpSync(join(root, 'parts', 'check', 'tests', 'F1013', 'fail'), folder, { recursive: true })
  const { findings } = await checkProject(folder)
  assert.ok(
    findings.some((one) => one.code === 'F1013'),
    findings.map((one) => one.code).join(' '),
  )
  for (const one of findings) assert.match(one.code, /^F\d{4}$/)

  const keyed = join(workFolder(t), 'keyed')
  cpSync(join(root, 'parts', 'test', 'tests', 'keyed'), keyed, { recursive: true })
  const app = await testApp({ folder: keyed, secrets: { GITHUB_ID: 'an id', GITHUB_SECRET: 'a secret' } })
  t.after(() => app.close())
  const refused = await app
    .as('system')
    .call('noSuchFunction', {})
    .then(
      () => undefined,
      (error: unknown) => error,
    )
  assert.ok(refused instanceof ForjrError, String(refused))
  assert.match(refused.code, /^F\d{4}$/)
})
