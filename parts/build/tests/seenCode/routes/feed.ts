import { anyone, route } from 'forjr'

export const feed = route('feed', {
  method: 'GET',
  path: '/feed.xml',
  access: anyone('the feed is public'),
  system: 'reads every paid order',
  run: async ({ db }) => {
    const paid = await db.system.orders.where({ status: 'paid' }).all()
    return new Response(String(paid.length))
  },
})
