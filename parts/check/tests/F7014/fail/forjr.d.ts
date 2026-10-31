import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    users: typeof import('./functions/reach').users
  }
  interface Functions {
    reach: typeof import('./functions/reach').reach
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
