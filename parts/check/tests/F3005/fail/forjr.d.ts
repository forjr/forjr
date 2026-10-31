import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    audit: typeof import('./functions/notes').audit
    notes: typeof import('./functions/notes').notes
  }
  interface Functions {
    openNotes: typeof import('./functions/notes').openNotes
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
