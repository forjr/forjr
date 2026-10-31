import { project, text } from 'forjr'

export const shop = project('shop', { title: 'Shop', settings: { shopName: { type: text({ default: 'Shop' }) } } })
