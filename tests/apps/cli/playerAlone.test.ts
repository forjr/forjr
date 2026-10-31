import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { buildProject } from '../../../parts/build/index.ts'
import { shopIn } from '../../../parts/cli/tests/bundledShop.ts'
import {
  outsideFolderOf,
  laidInstall,
  personIn,
  released,
  startedIn,
  until,
} from '../../../parts/cli/tests/released.ts'
import { startWords } from '../../../parts/cli/tests/startWords.ts'

test('[41-1] the commands of the player run in an install of the player alone, and load no build tool: forjr start', async (t) => {
  const rel = await released('1.0.0')
  const folder = outsideFolderOf(t, 'player-alone')
  const person = personIn(folder, { npm: false })
  const launcher = laidInstall(rel, person.forjr, ['runtime', 'player'])
  assert.equal(existsSync(join(person.forjr, 'versions', rel.version, 'tools')), false)
  const built = await buildProject(shopIn(folder), { for: 'release' })
  // A server of a bundle.
  const data = join(folder, 'data')
  // Each program is ended with the test, with every program it started, before the folder goes.
  startedIn(t, launcher, startWords(['start', built.bundleFolder, '--data', data, '--port', '0']), {
    cwd: folder,
    env: person.env,
  })
  const engineOf = (dataFolder: string): { port?: number } => {
    try {
      return JSON.parse(readFileSync(join(dataFolder, 'engine.json'), 'utf8'))
    } catch {
      return {}
    }
  }
  await until(() => typeof engineOf(data).port === 'number', 'the engine of forjr start', 60_000)
  assert.equal((await fetch(`http://127.0.0.1:${engineOf(data).port}/_f/health`)).status, 200)
})
