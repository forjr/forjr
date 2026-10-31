import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { checkProject } from '../index.ts'
import { copyOf } from './copies.ts'

const file = 'screens/orders.tsx'

test('[30-2] a field of a link that the type checker does not find names `.with`, which reads the row of the link', async () => {
  const folder = copyOf(join('F6018', 'pass'), 'F8000-link-with')
  writeFileSync(
    join(folder, 'functions', 'customers.ts'),
    [
      "import { input, link, query, table, text } from 'forjr'",
      '',
      "export const customers = table('customers', { columns: { name: text() }, access: { read: 'signedIn' } })",
      '',
      "export const visits = table('visits', {",
      "  columns: { customer: link('customers'), note: text() },",
      "  access: { read: 'signedIn' },",
      '})',
      '',
      "export const visitsOf = query('visitsOf', {",
      "  access: 'signedIn',",
      '  input: { note: text() },',
      "  rows: visits.where({ note: input('note') }),",
      '})',
      '',
    ].join('\n'),
  )
  writeFileSync(
    join(folder, file),
    [
      "import { read, screen } from 'forjr/ui'",
      "import { visitsOf } from '../functions/customers'",
      '',
      "export const ordersScreen = screen('ordersScreen', {",
      "  path: '/orders',",
      "  access: 'signedIn',",
      "  data: { visits: read(visitsOf, { note: 'a' }) },",
      '  view: ({ visits }) => <main>{visits.map((visit, place) => <span key={place}>{visit.customer.name}</span>)}</main>,',
      '})',
      '',
    ].join('\n'),
  )
  const found = (await checkProject(folder)).findings.filter((one) => one.code === 'F8000')
  assert.equal(found.length, 1, JSON.stringify(found))
  assert.match(String(found[0].fix), /\.with\('customer'\)/)
  assert.match(String(found[0].fix), /topic\.plans/)
})
