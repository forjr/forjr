import { project } from 'forjr'

export const journal = project('journal', {
  title: 'Journal',
  backups: { every: false },
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
