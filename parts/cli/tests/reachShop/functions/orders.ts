import { agent, backfill, change, incoming, input, model, number, object, python, query, secret, text } from 'forjr'
import { ship } from '../flows/ship'
import { notes, orders } from '../tables/orders'

export const openOrders = query('openOrders', {
  access: 'signedIn',
  offer: ['api'],
  rows: orders.limit(20),
})

export const addOrder = change('addOrder', {
  access: 'signedIn',
  input: { title: text(), total: number() },
  set: orders.add({ title: input('title'), total: input('total') }),
})

export const noteCount = query('noteCount', { access: 'signedIn', rows: notes.count() })

export const churn = python('churn', {
  file: 'ml/churn.py',
  input: { title: text() },
  output: object({ risk: number() }),
  access: 'signedIn',
  rows: { orders: orders.limit(10) },
})

export const writer = model('writer', { provider: 'anthropic', name: 'claude-sonnet-5-5', key: secret('ANTHROPIC_KEY') })

export const helper = agent('helper', {
  model: writer,
  instructions: 'You help with orders.',
  tools: [openOrders],
  access: 'signedIn',
})

export const stamp = backfill('stamp', {
  table: orders,
  run: (row, { db }) => {
    db.orders.change(row.id, { title: row.title })
  },
})

export const hook = incoming('hook', { path: '/hooks/orders', then: ship, open: 'the sender signs nothing' })
