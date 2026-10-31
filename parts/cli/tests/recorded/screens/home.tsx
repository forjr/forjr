import { screen } from 'forjr/ui'

export const home = screen('home', {
  path: '/',
  access: 'signedIn',
  view: () => <h1>Recorded</h1>,
})
