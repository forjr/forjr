import { screen, read } from 'forjr/ui'
import { openOrders } from './forjr'

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'anyone',
  title: 'A plain shop',
  data: { orders: read(openOrders) },
  view: ({ orders }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h1>A plain shop</h1>
      {orders.map((o, place) => <span key={place}>{o.name}</span>)}
    </div>
  ),
})
