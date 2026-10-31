import { project } from 'forjr'

export const pycalls = project('pycalls', {
  title: 'Python calls',
  python: { version: '3.15' },
  limits: { pythonStopAfter: '3 seconds', callDepth: 3, uploadSize: '1 MB' },
})
