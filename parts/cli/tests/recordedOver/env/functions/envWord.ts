import { query, text } from 'forjr'

// A word of the environment that the code of the function reads.
export const envWord = query('envWord', {
  access: 'signedIn',
  output: text(),
  run: () => process.env.RECORDED_WORD ?? 'none',
})
