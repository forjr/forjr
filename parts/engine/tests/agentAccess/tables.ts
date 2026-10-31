import { list, project, table, text } from 'forjr'

export const agentAccess = project('agentAccess', {})

export const users = table('users', {
  columns: { name: text(), roles: list(text()) },
  access: { read: 'owner' },
})
