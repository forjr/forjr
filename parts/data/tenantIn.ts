import { existsSync } from 'node:fs'
import { ForjrError } from '../core/index.ts'
import { heldMeta } from './metaKeys.ts'
import { sqliteStore } from './sqlite/store.ts'
import { metaTable } from './tables.ts'

/**
 * Takes the file of a backup. Answers the tenant that the file names as its own in `_f_meta`, or nothing for
 * the backup of a shared file. The file is opened once, as a store that only reads, and closed. Throws F0009 for
 * a file that is not there, and for one that is no data file.
 */
export function tenantIn(file: string): string | undefined {
  if (!existsSync(file)) throw new ForjrError('F0009', `No backup stands at ${file}.`)
  const noDataFile = () =>
    new ForjrError('F0009', `The file at ${file} is no data file: nothing was put back.`, {
      fix: 'Hand `restore` a file that `backup` made.',
    })
  const held = sqliteStore()
  try {
    held.open(file, { readOnly: true })
  } catch {
    throw noDataFile()
  }
  try {
    if (!held.layout().some((one) => one.name === metaTable.name)) throw noDataFile()
    const tenant = heldMeta(held, 'tenant')
    return typeof tenant === 'string' ? tenant : undefined
  } finally {
    held.close()
  }
}
