import { boolean, table, text } from 'forjr'

export const tasks = table('tasks', {
  columns: { title: text(), done: boolean({ default: false }) },
  access: { read: 'signedIn' },
})
