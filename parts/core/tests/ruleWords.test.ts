import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ruleWords } from '../internal.ts'

test('[55-4a] ruleWords says each stored rule of its table in its words', () => {
  const said: [unknown, string][] = [
    [{ rule: 'nobody' }, 'nobody'],
    [undefined, 'nobody'],
    ['anyone', 'nobody'],
    [{ rule: 'anyone', why: 'the contact form is public' }, 'anyone (why: the contact form is public)'],
    [{ rule: 'anyone', why: '' }, 'anyone'],
    [{ rule: 'signedIn' }, 'anyone signed in'],
    [{ rule: 'owner' }, 'the owner of the row'],
    [{ rule: 'role', role: 'staff' }, 'role staff'],
    [{ rule: 'where', filter: { col: 'status', is: 'open' } }, "where status is 'open'"],
    [{ rule: 'where', as: ['user', 'db'], give: { name: ['user', 'id'] } }, 'where a filter worked out'],
    [{ rule: 'allow', as: ['user', 'input', 'db'], test: { name: ['user', 'id'] } }, 'if a test worked out'],
    [{ rule: 'where', module: 'server/tables.orders.js', export: 'orders_access_read' }, 'a rule written as code'],
    [{ rule: 'allow', module: 'server/functions.orders.js', export: 'refund_access' }, 'a rule written as code'],
  ]
  for (const [rule, words] of said) assert.equal(ruleWords(rule), words, JSON.stringify(rule))
})

test('[55-4a] a filter of a rule in words: each test, given, any, all and not, and each kind of value', () => {
  const where = (filter: object): string => ruleWords({ rule: 'where', filter })
  const tests: [object, string][] = [
    [{ col: 'total', above: 10 }, 'where total above 10'],
    [{ col: 'total', atLeast: 10 }, 'where total at least 10'],
    [{ col: 'total', below: 1.5 }, 'where total below 1.5'],
    [{ col: 'total', atMost: 0 }, 'where total at most 0'],
    [{ col: 'status', not: 'shipped' }, "where status is not 'shipped'"],
    [{ col: 'status', in: ['open', 'paid'] }, "where status in ['open', 'paid']"],
    [{ col: 'note', contains: 'rush' }, "where note contains 'rush'"],
    [{ col: 'note', startsWith: 'A' }, "where note starts with 'A'"],
    [{ col: 'placedAt', before: { now: true } }, 'where placedAt before now'],
    [{ col: 'placedAt', after: { input: 'since' } }, 'where placedAt after input.since'],
    [{ col: 'note', empty: true }, 'where note is empty'],
    [{ col: 'summary', filled: 'old' }, 'where summary is old'],
    [{ col: 'paid', is: true }, 'where paid is true'],
    [{ col: 'placedBy', is: { caller: 'id' } }, 'where placedBy is caller.id'],
    [{ col: 'shop', is: { setting: 'shopName' } }, 'where shop is setting.shopName'],
    [{ col: 'total', is: { col: 'price' } }, 'where total is price'],
    [{ col: 'total', is: { calc: '+', left: 1, right: 2 } }, 'where total is a value worked out'],
    [
      { col: 'customer.name', contains: { input: 'search' }, given: true },
      'where customer.name contains input.search if given',
    ],
  ]
  for (const [filter, words] of tests) assert.equal(where(filter), words, JSON.stringify(filter))
  assert.equal(
    where({
      all: [
        { col: 'status', is: 'open' },
        { any: [{ col: 'note', empty: true }, { not: { col: 'placedBy', is: { caller: 'id' } } }] },
      ],
    }),
    "where status is 'open' and (note is empty or not (placedBy is caller.id))",
  )
})
