import { command } from 'forjr/cli'

export const report = command('report', {
  about: 'Says the orders',
  run: async ({ terminal }) => {
    terminal.write('orders\n')
    return 0
  },
})
