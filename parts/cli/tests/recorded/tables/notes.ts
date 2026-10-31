import { table, text } from 'forjr'

export const notes = table('notes', {
  columns: { words: text() },
  access: { read: 'signedIn', add: 'signedIn' },
})
