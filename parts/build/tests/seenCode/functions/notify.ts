import { action } from 'forjr'

export const notify = action('notify', {
  access: 'signedIn',
  run: async () => {
    const at = Date.now()
    return at
  },
})
