import { screen } from 'forjr/ui'

export const baseScreen = screen('baseScreen', {
  path: '/',
  access: 'anyone',
  view: () => <span>Nothing of the vault</span>,
})
