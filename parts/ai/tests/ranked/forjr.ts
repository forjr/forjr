import { project } from 'forjr'

export const library = project('library', {
  title: 'Library',
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
