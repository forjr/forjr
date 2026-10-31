import { seed } from 'forjr'

export default seed(({ db }) => {
  db.users.add({ name: 'Ada', roles: [] })
})
