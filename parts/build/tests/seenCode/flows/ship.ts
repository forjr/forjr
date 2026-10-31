import { agent, flow, model, secret } from 'forjr'

export const ship = flow('ship', {
  run: async ({ db }) => {
    const at = Date.now()
    await db.system.audit.add({ line: `shipped at ${at}` })
  },
})

export const writer = model('writer', { provider: 'anthropic', name: 'claude-sonnet-5-5', key: secret('ANTHROPIC_KEY') })

export const helper = agent('helper', { model: writer, instructions: 'You help.', tools: [], access: 'signedIn' })
