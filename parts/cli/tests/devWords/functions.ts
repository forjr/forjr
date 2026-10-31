import { query, text } from 'forjr'

export const greeting = query('greeting', {
  access: 'anyone',
  input: { name: text({ default: '' }) },
  output: text(),
  run: ({ input }) => `Hello ${input.name}`,
})
