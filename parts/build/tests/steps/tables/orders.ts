import { table, text } from 'forjr'

export const orders = table('orders', { columns: { status: text() }, access: { read: 'signedIn' } })
