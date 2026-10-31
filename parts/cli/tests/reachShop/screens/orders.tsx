import { component, read, screen } from 'forjr/ui'
import { addOrder, noteCount, openOrders } from '../functions/orders'

export const Total = component('Total', {
  data: () => ({ orders: read(openOrders) }),
  view: ({ orders }) => <p>{orders.length}</p>,
})

export const ordersScreen = screen('ordersScreen', {
  path: '/orders',
  access: 'signedIn',
  data: () => ({ notes: read(noteCount) }),
  view: ({ notes }) => (
    <main>
      <Total />
      <p>{notes}</p>
      <button type="button" onClick={() => addOrder({ title: 'A lamp', total: 3 })}>
        Add
      </button>
    </main>
  ),
})
