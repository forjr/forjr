import { action, backfill, change, emit, number, object, python, start, text } from 'forjr'
import { helper, ship } from '../flows/ship'
import { orders } from '../tables/orders'
import { notify } from './notify'

export const addOrder = change('addOrder', { access: 'signedIn', set: orders.add({ status: 'open' }) })

export const markPaid = change('markPaid', {
  access: 'signedIn',
  input: { id: text() },
  run: async ({ db, input }) => {
    let found = await db.orders.get(input.id)
    if (!found) found = undefined
    await db.orders.change(input.id, { status: 'paid', note: 'paid' })
    await db.system.audit.add({ line: 'paid' })
    await notify({})
    await helper.approve('a run')
    await start(ship, {})
    emit('paid', { id: input.id })
    return found
  },
})

const tableName = 'orders'
const kind = 'swept'

/** A helper of the file: what it does for a definition stays unseen. */
function touchAll(db: { orders: { remove(id: string): unknown } }): void {
  db.orders.remove('every')
}

export const sweep = action('sweep', {
  access: 'signedIn',
  run: async ({ db }) => {
    touchAll(Object(db))
    await Object(db)[tableName].all()
    emit(kind, {})
  },
})

export const stamp = backfill('stamp', {
  table: orders,
  run: (row, { db }) => {
    db.orders.change(row.id, { note: 'stamped' })
  },
})

export const churn = python('churn', {
  file: 'ml/churn.py',
  input: { id: text() },
  output: object({ risk: number() }),
  access: 'signedIn',
  rows: { orders: orders.limit(10) },
})
