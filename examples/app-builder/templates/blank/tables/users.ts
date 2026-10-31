import { list, table, text } from 'forjr'

export const users = table('users', {
  columns: {
    email: text({ unique: true, personal: true }),
    roles: list(text(), { default: [] }),
  },
  access: { read: 'owner' },
})
