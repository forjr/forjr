import { action, agent, allow, model, query, secret } from 'forjr'
import { notes } from '../tables/notes'

export const writer = model('writer', { provider: 'anthropic', name: 'claude-sonnet-5-5', key: secret('ANTHROPIC_KEY') })

export const myNotes = query('myNotes', {
  access: allow((user, input, db) => db.users.get(user?.id ?? '') !== undefined),
  rows: notes.limit(20),
})

export const tidyNotes = action('tidyNotes', {
  access: 'signedIn',
  system: 'it tidies every note',
  run: async () => {},
})

export const helper = agent('helper', {
  model: writer,
  instructions: 'You help with notes.',
  tools: [myNotes],
  access: 'signedIn',
  policy: { read: ['*'], tools: ['map', 'read'], mode: 'propose' },
})
