import { boolean, project } from 'forjr'

export const shop = project('shop', {
  title: 'Shop',
  limits: { anyonePerMinute: 100000, screensPerMinute: 100000 },
  state: { dark: { type: boolean(), in: 'device' } },
})
