import { change, input, text } from 'forjr'
import { notes } from './tables.ts'

export const addNote = change('addNote', {
  access: 'signedIn',
  input: { words: text() },
  set: notes.add({ words: input('words') }),
})
