import { get, object, service, text } from 'forjr'

export const weather = service('weather', {
  url: 'https://weather.example.com',
  calls: {
    today: get('/today', { input: { city: text() }, output: object({ sky: text() }) }),
  },
})
