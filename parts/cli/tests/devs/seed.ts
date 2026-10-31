import { seed } from 'forjr'

export default seed(({ db }) => {
  db.items.add({ title: 'seeded' })
})
