import { agent, model, secret } from 'forjr'

export const writer = model('writer', { provider: 'anthropic', name: 'claude-sonnet-5-5', key: secret('ANTHROPIC_KEY') })

export const emptyRun = agent('emptyRun', {
  model: writer,
  instructions: 'You help.',
  tools: [],
  limits: { steps: 12, perRun: {} },
})

export const unknownUnit = agent('unknownUnit', {
  model: writer,
  instructions: 'You help.',
  tools: [],
  limits: { steps: 12, perRun: { pictures: 3 } },
})
