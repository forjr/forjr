import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    users: typeof import('./tables/users').users
  }
  interface Functions {}
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
