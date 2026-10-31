import { query, table, text } from 'forjr'

export const vault = table('vault', {
  columns: { name: text(), key: text({ sealed: true }) },
  access: { read: 'signedIn' },
})

export const byKey = query('byKey', { access: 'signedIn', rows: vault.where({ key: 'door' }).limit(20) })
