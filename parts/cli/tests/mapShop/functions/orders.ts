import { change, emit, input, number, query, role, text } from 'forjr'
import { orders } from '../tables/orders'
import { cents } from './money'

export const openOrders = query('openOrders', {
  access: 'signedIn',
  offer: ['api'],
  rows: orders.where({ status: 'open' }).with('customer').newest('createdAt').limit(20),
})

export const addOrder = change('addOrder', {
  access: 'signedIn',
  input: { customer: text(), total: number() },
  set: orders.add({ customer: input('customer'), total: input('total') }),
})

export const markPaid = change('markPaid', {
  access: role('staff'),
  input: { id: text() },
  run: ({ db, input }) => {
    db.orders.change(input.id, { status: 'paid', total: cents(1) / 100 })
    emit('paid', { id: input.id })
  },
})
