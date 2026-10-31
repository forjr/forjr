import { screen } from 'forjr/ui'
import './shared.css'

export const aboutScreen = screen('aboutScreen', {
  path: '/about',
  access: 'signedIn',
  view: () => <main>About the notes.</main>,
})
