import { table } from 'forjr'

export const usage = table('usage', { shows: 'counts', access: { read: 'owner' } })
