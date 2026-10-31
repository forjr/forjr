import { table, text } from 'forjr'

export const notes = table('notes', {
  columns: { what: text() },
  access: { read: 'anyone', add: 'anyone' },
})
