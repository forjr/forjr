import { boolean, number, query, table, text } from 'forjr'

export const orders = table('orders', {
  columns: { name: text(), total: number({ min: 0 }), paid: boolean() },
  access: { read: 'anyone' },
})

export const allOrders = query('allOrders', { access: 'anyone', rows: orders.oldest('name') })
