import { choice, table, text } from 'forjr'

export const orders = table('orders', {
  columns: { status: choice(['open', 'paid']), note: text({ optional: true }) },
  access: { read: 'signedIn', add: 'signedIn', change: 'signedIn' },
})

export const audit = table('audit', { columns: { line: text() }, access: { read: 'signedIn' } })
