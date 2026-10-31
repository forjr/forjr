import { project } from 'forjr'

export const moving = project('moving', {
  title: 'Notes that move',
  limits: { openFiles: 50, fileCloseAfter: '1 minute', filesAtOnce: 4 },
  backups: { every: false, keep: 2 },
})
