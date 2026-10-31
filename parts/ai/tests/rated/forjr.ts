import { project } from 'forjr'

export const quality = project('quality', {
  title: 'Quality',
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
