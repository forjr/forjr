import { screen, Form } from 'forjr/ui'
import { addNote } from '../functions/note'
import { frameAt } from '../lib/at'

// A screen that frames a page of another host, as a project lets `unlock.frames` open, with a form a case sends.
export const framed = screen('framed', {
  path: '/framed',
  access: 'signedIn',
  view: () => (
    <main>
      <iframe src={frameAt} title="Another host" />
      <Form call={addNote} aria-label="New note">
        <input name="words" />
        <button type="submit">Save</button>
      </Form>
    </main>
  ),
})
