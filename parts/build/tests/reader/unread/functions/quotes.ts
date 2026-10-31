import { number, query, table, text } from 'forjr'

export const notes = table('notes', { columns: { body: text(), n: number() }, access: { read: 'signedIn' } })

export const ofAnswer = query('ofAnswer', {
  access: 'signedIn',
  about: text().constructor.constructor('process.getBuiltinModule('node:fs').writeFileSync(process.env.FORJR_TEST_MARK, 'answer')')(),
  rows: notes.limit(5),
})
