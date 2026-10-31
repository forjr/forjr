import { project } from 'forjr'

export const shop = project('shop', {
  title: 'Shop',
  limits: { anyonePerMinute: 5 },
  unlock: { scripts: ['https://js.stripe.com'] },
})
