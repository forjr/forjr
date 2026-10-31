import { list, table, text } from 'forjr'

export const users = table('users', {
  columns: { name: text(), email: text({ personal: true }), roles: list(text()) },
  access: { read: 'signedIn' },
})
