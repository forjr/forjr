import { screen } from 'forjr/ui'

export const orderScreen = screen('orderScreen', {
  path: '/orders/:id',
  access: 'signedIn',
  view: ({ params }) => <span>{params.id}</span>,
})
