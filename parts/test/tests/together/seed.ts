import { seed } from 'forjr'

export default seed(({ db }) => {
  db.docs.add({ title: 'First', body: 'Start' })
})
