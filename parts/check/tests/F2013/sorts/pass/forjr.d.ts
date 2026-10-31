import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    members: typeof import('./functions/desk').members
    orders: typeof import('./functions/desk').orders
    teams: typeof import('./functions/desk').teams
    users: typeof import('./functions/desk').users
  }
  interface Functions {
    byName: typeof import('./functions/desk').byName
    ofAda: typeof import('./functions/desk').ofAda
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
