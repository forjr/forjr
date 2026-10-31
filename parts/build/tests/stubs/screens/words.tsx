import { screen } from 'forjr/ui'

export const wordsScreen = screen('wordsScreen', {
  path: '/words',
  access: 'anyone',
  view: () => (
    <main>
      <p>Plain words</p>
    </main>
  ),
})
