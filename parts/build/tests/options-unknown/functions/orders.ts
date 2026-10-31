import { number, query, table } from 'forjr'

export const orders = table('orders', { columns: { total: number() }, access: { read: 'signedIn' } })

export const openOrders = query('openOrders', {
  access: 'signedIn',
  refesh: '1 minute',
  rows: orders.limit(10),
})
