import { project } from 'forjr'

export const seamed = project('seamed', {
  title: 'Seamed',
  limits: { anyonePerMinute: 10000000, screensPerMinute: 10000000 },
})
