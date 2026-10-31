import { project } from 'forjr'

export const notebook = project('notebook', {
  title: 'Notebook',
  mail: { from: 'notes@example.com' },
  backups: { every: false },
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
