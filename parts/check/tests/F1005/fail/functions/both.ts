import { query } from 'forjr'
import { Link } from 'forjr/ui'
import { notes } from './notes'

export const shown = query('shown', { access: 'signedIn', about: String(Link), rows: notes.limit(5) })
