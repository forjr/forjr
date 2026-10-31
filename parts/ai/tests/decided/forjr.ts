import { project } from 'forjr'

export const decisions = project('decisions', {
  title: 'Decisions',
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
