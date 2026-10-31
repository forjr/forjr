import { project } from 'forjr'

export const shop = project('shop', {
  title: 'Shop',
  privateHosts: ['http://127.0.0.1'],
  mail: { from: 'shop@example.com' },
})
