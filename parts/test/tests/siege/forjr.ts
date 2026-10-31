import { project } from 'forjr'

export const siege = project('siege', {
  title: 'A door under attack',
  limits: { functionDepth: 8 },
  backups: { every: false },
})
