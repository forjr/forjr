import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    notes: typeof import('./tables').notes
  }
  interface Functions {
    atOnce: typeof import('./functions').atOnce
    newest: typeof import('./functions').newest
    oneRead: typeof import('./functions').oneRead
    oneWrite: typeof import('./functions').oneWrite
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
declare module 'forjr/ui' {
  interface Messages {}
  interface AppState {}
}
