import { project } from 'forjr'

export const counter = project('counter', {
  title: 'Counter',
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
