import { anyone, query, text } from 'forjr'

export const openingHours = query('openingHours', {
  about: 'When the shop is open',
  access: anyone('the hours are public'),
  offer: ['mcp'],
  input: {},
  output: text(),
  run: () => 'nine to five',
})
