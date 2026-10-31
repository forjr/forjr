import { project, table, text } from 'forjr'

export const roomCopy = project('roomCopy', {
  limits: { queryTime: '3 seconds', actionTime: '2 seconds' },
})

export const notes = table('notes', {
  columns: { what: text() },
  access: { read: 'anyone', add: 'anyone' },
})
