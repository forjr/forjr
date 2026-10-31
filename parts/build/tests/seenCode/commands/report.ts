import { command } from 'forjr/cli'
import { addOrder } from '../functions/orders'

export const report = command('report', {
  about: 'Adds an order',
  run: async ({ call }) => {
    await call(addOrder, {})
    return 0
  },
})
