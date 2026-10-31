import type { TableLayout } from '../../data/index.ts'

/** `_f_rate`: the count of each caller and address in the minute that runs. A table of this machine alone. */
export const table: TableLayout = {
  name: '_f_rate',
  columns: { key: { kind: 'text' }, windowStart: { kind: 'date' }, count: { kind: 'number', whole: true } },
  key: ['key'],
  indexes: [],
  unique: [],
  search: [],
  own: true,
}
