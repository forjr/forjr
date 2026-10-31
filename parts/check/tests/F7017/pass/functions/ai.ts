import { action, agent, model, secret, text } from 'forjr'

export const writer = model('writer', { provider: 'anthropic', name: 'claude-sonnet-5-5', key: secret('ANTHROPIC_KEY') })

export const tidyUp = action('tidyUp', { about: 'Tidies up', access: 'signedIn', input: {}, output: text(), run: async () => 'tidy' })

export const helper = agent('helper', { model: writer, instructions: 'You help.', tools: [tidyUp], trust: [tidyUp], limits: { steps: 12, perRun: { tokensOut: 50000 } } })
