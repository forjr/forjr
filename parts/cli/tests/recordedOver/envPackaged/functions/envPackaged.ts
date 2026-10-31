import { query, text } from 'forjr'
import { word } from 'recorded-word'

// A word of the environment that a package reads for the code of the function.
export const envPackaged = query('envPackaged', {
  access: 'signedIn',
  output: text(),
  run: () => word(),
})
