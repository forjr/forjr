import { number, query, table } from 'forjr'
import { Link } from 'forjr/ui'

export const orders = table('orders', { columns: { total: number() }, access: { read: 'signedIn' } })

export const openOrders = query('openOrders', { access: 'signedIn', about: String(Link), rows: orders.limit(10) })
