import { screen } from 'forjr/ui'
import { markPaid } from '../functions/orders'

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'signedIn',
  view: () => (
    <button type="button" onClick={() => markPaid({ id: 'a' })}>
      Pay
    </button>
  ),
})
