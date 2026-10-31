import { query, text } from 'forjr'

export const label = query('label', { access: 'anyone', output: text(), run: () => 'Label first' })
