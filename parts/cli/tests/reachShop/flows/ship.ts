import { flow } from 'forjr'
import { orders } from '../tables/orders'

export const ship = flow('ship', {
  on: orders.added(),
  run: async ({ step }) => {
    await step('pack', () => 1)
  },
})
