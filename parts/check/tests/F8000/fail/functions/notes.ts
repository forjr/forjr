import { number, query, table, text } from 'forjr'

export const notes = table('notes', { columns: { body: text(), n: number() }, access: { read: 'signedIn' } })

const most: number = 'twenty'

export const openNotes = query('openNotes', { access: 'signedIn', rows: notes.where({ body: most }).limit(20) })
