import { service } from 'forjr'

export const api = service('api', {
  url: 'https://api.example.com',
  from: '../../shared/api.json',
  use: ['GetThings'],
})
