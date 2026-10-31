import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    orders: typeof import('./functions/notes').orders
    users: typeof import('./functions/notes').users
  }
  interface Functions {
    markPaid: typeof import('./functions/notes').markPaid
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
