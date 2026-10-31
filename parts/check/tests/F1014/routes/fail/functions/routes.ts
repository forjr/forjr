import { route } from 'forjr'

// Under `/_f/` lie the addresses of the engine: it would never be reached.
export const inside = route('inside', {
  method: 'GET',
  path: '/_f/own',
  access: 'anyone',
  run: async () => new Response('never'),
})

// The first part of the address is the code of a language of the project.
export const turkish = route('turkish', {
  method: 'GET',
  path: '/tr/feed.xml',
  access: 'anyone',
  run: async () => new Response('never'),
})

export const relative = route('relative', {
  method: 'GET',
  path: 'feed.xml',
  access: 'anyone',
  run: async () => new Response('never'),
})
