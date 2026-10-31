import { table, text } from 'forjr'

export const notes = table('notes', { columns: { body: text() }, access: { read: 'signedIn', add: 'signedIn' } })
