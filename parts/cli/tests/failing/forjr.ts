import { project } from 'forjr'

export const failing = project('failing', {
  title: 'Failing',
  limits: { anyonePerMinute: 100000, screensPerMinute: 100000, liveConnections: 1000 },
})
