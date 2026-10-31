import 'tiny-font'
import './app.css'
import { screen } from 'forjr/ui'

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'anyone',
  view: () => <h1>Home</h1>,
})
