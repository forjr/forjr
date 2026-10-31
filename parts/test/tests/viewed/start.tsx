import { screen, Link } from 'forjr/ui'

// A screen whose link the page follows itself: the screen it opens is drawn by the page code in the browser.
export const startScreen = screen('startScreen', {
  path: '/start',
  access: 'anyone',
  title: 'Start',
  view: () => (
    <Link to="/valued" id="go">
      Go
    </Link>
  ),
})
