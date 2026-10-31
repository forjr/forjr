import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { forjr } from '../../../parts/cli/shell.ts'

test('[15-8] forjr docs --reference prints the file of the installed package byte for byte', async () => {
  const kept = readFileSync(join(import.meta.dirname, '..', '..', '..', 'parts', 'docs', 'reference.txt'), 'utf8')
  const lines: string[] = []
  assert.equal(await forjr(['docs', '--reference'], { out: (line) => lines.push(line) }), 0)
  assert.equal(`${lines.join('\n')}\n`, kept)
})
