import { project } from 'forjr'

// A shop whose work waits across a restart: every trace is kept.
export const shop = project('shop', { title: 'Shop', trace: { share: 1 } })
