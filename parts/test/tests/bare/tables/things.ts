import { anyone, table, text } from 'forjr'

export const things = table('things', {
  columns: { name: text() },
  access: { read: anyone('the things are shown to every visitor') },
})
