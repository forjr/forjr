import { action, anyone, mail, secrets } from 'forjr'

const open = anyone('a test is answered a code that has no status')

// The project states no mail and the engine connects no mailer: F0020.
export const noMail = action('noMail', {
  access: open,
  run: async () => mail.send({ from: 'shop@example.com', to: 'ada@example.com', subject: 'Hello', text: 'Hello' }),
})

// A member of full access in an action that states no `system`: F0013 to a browser; as the system, with no key at hand, F0019.
export const setSecret = action('setSecret', {
  access: open,
  run: async () => secrets.set('A_SECRET', 'a value'),
})
