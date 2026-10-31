import { table, text } from 'forjr'

// A table that no test reads or writes.
export const archive = table('archive', {
  columns: { words: text() },
  access: { read: 'signedIn' },
})
