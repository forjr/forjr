import { list, project, table, text } from 'forjr'

export const modeled = project('modeled', {})

export const users = table('users', {
  columns: { name: text(), roles: list(text()) },
  access: { read: 'signedIn' },
})
