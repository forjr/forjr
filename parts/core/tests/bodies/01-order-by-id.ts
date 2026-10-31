import { query } from 'forjr'

export const orderById = query('orderById', {
  access: 'everyone',
  run: ({ input, db }) => db.orders.get(input.order),
})
