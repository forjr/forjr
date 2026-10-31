import { model, secret } from 'forjr'

export const writer = model('writer', {
  provider: 'anthropic',
  name: 'claude-sonnet-5-5',
  key: secret('ANTHROPIC_KEY'),
})
