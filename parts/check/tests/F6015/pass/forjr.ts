import { choice, project } from 'forjr'

export const shop = project('shop', {
  currency: 'USD',
  state: { mode: choice(['light', 'dark'], { default: 'light' }) },
})
