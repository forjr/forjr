import { project } from 'forjr'

export const migrated = project('migrated', {
  title: 'An app whose next version backfills its rows',
  backups: { every: false, keep: 3 },
})
