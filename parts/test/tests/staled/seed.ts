import { seed } from 'forjr'

export default seed(({ db }) => {
  db.news.add({ title: 'First news' })
})
