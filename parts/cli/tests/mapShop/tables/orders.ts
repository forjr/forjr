import { choice, link, number, role, table, text } from 'forjr'

export const customers = table('customers', { columns: { name: text() }, access: { read: 'signedIn' } })

export const orders = table('orders', {
  columns: {
    customer: link('customers'),
    total: number(),
    status: choice(['open', 'paid'], { default: 'open' }),
  },
  access: { read: 'signedIn', add: 'signedIn', change: role('staff') },
})
