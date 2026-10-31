import { event, flow } from 'forjr'

export const tell = flow('tell', {
  on: event('paid'),
  run: async ({ step }) => {
    await step('tell the staff', () => 1)
  },
})
