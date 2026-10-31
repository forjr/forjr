import type {} from 'forjr'
declare module 'forjr' {
  interface Tables {
    audit: typeof import('./functions/notes').audit
  }
  interface Functions {
    addLine: typeof import('./functions/notes').addLine
  }
  interface Flows {}
  interface Services {}
  interface Models {}
  interface Settings {}
}
