import { number, table, text } from 'forjr'

export const orders = table('orders', {
  columns: { title: text(), total: number() },
  access: { read: 'signedIn', add: 'signedIn', change: 'signedIn' },
})

export const notes = table('notes', { columns: { body: text() }, access: { read: 'signedIn' } })
