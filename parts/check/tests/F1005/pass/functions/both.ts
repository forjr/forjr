import { query } from 'forjr'
import type { Link } from 'forjr/ui'
import { notes } from './notes'

export type Shown = typeof Link

export const shown = query('shown', { access: 'signedIn', rows: notes.limit(5) })
