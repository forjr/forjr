import { list, table, text } from 'forjr'

export const users = table('users', { columns: { name: text(), roles: list(text()) }, access: { read: 'signedIn' } })
