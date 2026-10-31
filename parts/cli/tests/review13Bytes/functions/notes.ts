import { change, input, query, text } from 'forjr'
import { notes } from '../tables/notes'

export const allNotes = query('allNotes', { access: 'signedIn', rows: notes.newest('createdAt').limit(12) })

export const addNote = change('addNote', {
  access: 'signedIn',
  input: { body: text() },
  set: notes.add({ body: input('body') }),
})
