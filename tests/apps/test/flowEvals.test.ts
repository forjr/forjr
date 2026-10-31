import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { evals, testApp } from '../../../parts/test/index.ts'

// What `evals` runs as its target.

test('[17-4] evals of a flow run the flow with the input of each case, and hold what it answered', async (t) => {
  // The project is copied first: its build writes `forjr.d.ts` beside its files.
  mkdirSync(join(process.cwd(), 'results', 'test'), { recursive: true })
  const folder = mkdtempSync(join(process.cwd(), 'results', 'test', 'evals-'))
  t.after(() => rmSync(folder, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }))
  cpSync(join(import.meta.dirname, '..', '..', '..', 'parts', 'test', 'tests', 'flowBodies'), folder, {
    recursive: true,
  })
  const app = await testApp({ folder })
  try {
    // `17`, section 3: "`target` is an agent, a flow or a function"; `plainFive` answers the name it was handed.
    const result = await evals(app, 'plainFive', [{ input: { name: 'ada' }, expect: { value: 'ada' } }])
    assert.deepEqual([result.passed, result.failed], [1, 0], JSON.stringify(result.each))
  } finally {
    await app.close()
  }
})
