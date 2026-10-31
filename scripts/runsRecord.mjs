// The record of the runs of the tests, which the framework's own map and impact read.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Takes the folder of a tree. Answers the record that `npm test` keeps of each test file, with the paths each one
 * touched, by the test file, or nothing where the tests never ran there.
 */
export function runsRecord(tree) {
  const file = join(tree, 'results', 'kept', 'all.json')
  if (!existsSync(file)) return undefined
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}
