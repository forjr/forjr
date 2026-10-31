import { project } from 'forjr'

export const shop = project('shop', {
  title: 'Shop',
  uploads: 'anyone',
  limits: { anyonePerMinute: 100000, callerPerMinute: 100000 },
})
