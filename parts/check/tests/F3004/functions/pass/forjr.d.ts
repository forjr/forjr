import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    notes: typeof import('./functions/notes').notes
  }
  interface Functions {
    addNote: typeof import('./functions/notes').addNote
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
