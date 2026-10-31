import { seed } from 'forjr'

export default seed(({ db }) => {
  db.users.add({ email: 'maya@example.com', roles: [] })
  db.users.add({ email: 'omar@example.com', roles: [] })
})
