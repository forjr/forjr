import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { codes } from '../../core/internal.ts'
import type { Running } from './apps.ts'
import { running, send } from './apps.ts'

/** Sends a command to the admin channel of an app with the token of its data folder. */
function command(run: Running, name: string, args: object): ReturnType<typeof send> {
  const token = String(JSON.parse(readFileSync(join(run.dataFolder, 'engine.json'), 'utf8')).token)
  return send(run.app, `${run.origin}/_f/admin/${name}`, {
    body: JSON.stringify({ args }),
    headers: { authorization: `Bearer ${token}` },
  })
}

test('[16-2@7a] F2107, F0020 and F0021, which have no status, reach a browser as themselves with 500 and a ref, the general sentence on live data; on test data nothing is sent, and no mailer is needed', async (t) => {
  for (const mode of ['test', 'live'] as const) {
    const run = await running(t, { project: 'noStatus', open: { mode, address: '*' } })
    const answered = await send(run.app, `${run.origin}/_f/call/noMail`, { headers: { origin: run.origin } })
    if (mode === 'test') {
      assert.equal(answered.status, 200, 'a test keeps the message in its mailbox')
      continue
    }
    assert.equal(answered.status, 500, mode)
    assert.deepEqual([answered.error.code, answered.error.name], ['F0020', 'no-mailer'], mode)
    assert.match(String(answered.error.ref), /^[A-Za-z0-9_-]{8}$/, mode)
    assert.equal(answered.error.message, codes.F0009.sentence)
    assert.equal(answered.error.fix, undefined)
  }
})

test('[16-2@7a] any other code that has no status still reaches a browser as F0009, and a command is told it as itself', async (t) => {
  const run = await running(t, { project: 'noStatus' })
  const called = await send(run.app, `${run.origin}/_f/call/setSecret`, { headers: { origin: run.origin } })
  assert.deepEqual([called.status, called.error.code], [500, 'F0009'])
  const commanded = await command(run, 'run', { name: 'setSecret' })
  assert.deepEqual([commanded.status, commanded.error.code, commanded.error.name], [500, 'F0019', 'secret-missing'])
  assert.match(String(commanded.error.message), /A_SECRET|key/)
  assert.match(String(commanded.error.ref), /^[A-Za-z0-9_-]{8}$/)
})
