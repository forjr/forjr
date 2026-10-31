import { project } from 'forjr'

export const ruledColumns = project('ruledColumns', {
  title: 'Columns that only some callers read, and sealed values that are found',
  backups: { every: false },
})
