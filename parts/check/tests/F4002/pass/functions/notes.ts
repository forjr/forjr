import { change, number, query, random, table, text } from 'forjr'

export const notes = table('notes', { columns: { body: text(), n: number() }, access: { read: 'signedIn' } })

export const draw = change('draw', { access: 'signedIn', output: number(), run: () => random() })
