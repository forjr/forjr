import { query } from 'forjr'
import { screen } from 'forjr/ui'

export const ordersScreen = screen('ordersScreen', {
  path: '/',
  access: 'signedIn',
  view: () => <span>{String(query)}</span>,
})
