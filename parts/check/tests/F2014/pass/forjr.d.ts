import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    lines: typeof import('./functions/desk').lines
    members: typeof import('./functions/desk').members
    orders: typeof import('./functions/desk').orders
    teams: typeof import('./functions/desk').teams
    users: typeof import('./functions/desk').users
  }
  interface Functions {}
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
