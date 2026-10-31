import { query, text } from 'forjr'

// A function that no test calls.
export const forgotten = query('forgotten', {
  access: 'signedIn',
  output: text(),
  run: () => 'never asked',
})
