import { query, text } from 'forjr'

export const openOrders = query('openOrders', {
  about: 'The open orders',
  access: 'signedIn',
  offer: ['mcp'],
  input: {},
  output: text(),
  run: () => 'none',
})
