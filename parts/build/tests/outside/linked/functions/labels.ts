import { query, table, text } from 'forjr'
import { LABEL } from '../linked/labels'

export const notes = table('notes', { columns: { body: text() }, access: { read: 'signedIn' } })

export const labelled = query('labelled', { access: 'signedIn', about: LABEL, rows: notes.where({ body: LABEL }) })
