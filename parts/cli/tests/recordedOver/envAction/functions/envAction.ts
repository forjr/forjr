import { action, text } from 'forjr'

// A word of the environment that the code of an action reads, in whichever room the action runs.
export const envAction = action('envAction', {
  access: 'signedIn',
  input: {},
  output: text(),
  run: async () => process.env.RECORDED_WORD ?? 'none',
})
