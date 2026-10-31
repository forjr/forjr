import { anyone, project, table, text } from 'forjr'

export const routed = project('routed', {})

export const notes = table('notes', {
  columns: { words: text() },
  access: { read: anyone('the notes are shown to every visitor') },
})
