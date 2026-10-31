import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    users: typeof import('./functions/notes').users
  }
  interface Functions {}
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
