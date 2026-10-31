import { Form, read, screen } from 'forjr/ui'
import { addNote, allNotes } from '../functions/notes'
import './shared.css'
import './home.css'

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'signedIn',
  data: { notes: read(allNotes) },
  view: ({ notes }) => (
    <main className="home">
      {notes.map((one) => (
        <p key={one.id}>{one.body}</p>
      ))}
      <Form call={addNote} with={{ body: 'a note' }}>
        <button type="submit">Add</button>
      </Form>
    </main>
  ),
})
