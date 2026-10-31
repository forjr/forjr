import { project } from 'forjr'

export const planned = project('planned', {
  title: 'Planned',
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000, screensPerMinute: 100000 },
})
