import { change, input, text } from 'forjr'
import { orders } from '../tables/orders'

export const addOrder = change('addOrder', {
  access: 'signedIn',
  input: { title: text({ min: 1 }) },
  set: orders.add({ title: input('title') }),
})
