import type { Finding } from 'forjr'
import { screen } from 'forjr/ui'

export const findingsScreen = screen('findingsScreen', {
  path: '/findings',
  access: 'signedIn',
  view: ({ findings }: { findings: Finding[] }) => <span>{findings.length}</span>,
})
