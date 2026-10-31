import { anyone, query, text } from 'forjr'

export const hello = query('hello', {
  access: anyone('a test asks the app'),
  output: text(),
  run: () => 'hello',
})
