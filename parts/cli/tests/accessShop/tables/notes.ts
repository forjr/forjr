import { caller, link, table, text, where } from 'forjr'

export const notes = table('notes', {
  columns: { body: text(), by: link('users') },
  access: { read: where({ by: caller('id') }), add: 'signedIn', change: where((user, db) => db.users.get(user?.id ?? '')) },
})
