import { seed } from 'forjr'

export default seed(({ db }) => {
  db.notes.add({ title: 'First note' })
})
