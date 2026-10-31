import { number, query, table, text } from 'forjr'

export const notes = table('notes', { columns: { body: text(), n: number() }, access: { read: 'signedIn' } })

export const open_notes = query('open_notes', { access: 'signedIn', rows: notes.limit(20) })
