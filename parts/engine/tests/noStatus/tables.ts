import { list, project, table, text } from 'forjr'

export const noStatus = project('noStatus', { backups: { every: false } })

export const users = table('users', {
  columns: { email: text({ unique: true }), roles: list(text()) },
  access: { read: 'owner' },
})
