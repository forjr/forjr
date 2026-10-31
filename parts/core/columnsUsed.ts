import type { Description } from './description.ts'
import type { Stored } from './record.ts'
import { isStored } from './record.ts'

/** What a plan, a write or a body reads and writes, each column as `<table>.<column>`, each list in the order of its names. */
export interface ColumnsUsed {
  reads: string[]
  writes: string[]
  // Tables whose whole rows are read, for a plan that picks nothing, and whose rows are removed.
  whole: string[]
  removes: string[]
  // False where the record is code that states what it reads or touches by table alone, or nothing.
  known: boolean
}

/** What is found while a record is read, each list as a set. */
interface Found {
  reads: Set<string>
  writes: Set<string>
  whole: Set<string>
  removes: Set<string>
}

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((one) => typeof one === 'string') : []

/**
 * Takes the description, a table and the names of a path through its columns. Answers each column the path reads,
 * the link of each step among them, and the table it ends at. Walks the links as `throughLinks` of
 * `stored/shared.ts` walks the options a definition was written with: one rule on two inputs.
 */
function through(description: Description, table: string, path: string): { columns: string[]; at: string } {
  const columns: string[] = []
  let at = table
  for (const name of path.split('.')) {
    columns.push(`${at}.${name}`)
    const column: unknown = Reflect.get(Object(Reflect.get(Object(description.tables[at]), 'columns')), name)
    const link = isStored(column) && column.kind === 'list' && isStored(column.of) ? column.of : column
    if (!isStored(link) || link.kind !== 'link' || typeof link.table !== 'string') break
    at = link.table
  }
  return { columns, at }
}

/** The columns of a table that its search reads, as the table states them. */
function searched(description: Description, table: string): string[] {
  const search: unknown = Reflect.get(Object(description.tables[table]), 'search')
  return isStored(search) ? textList(search.columns) : textList(search)
}

/** Reads a stored filter of a table: each column it tests, through links, and each plan it holds. */
function readFilter(description: Description, table: string, filter: unknown, found: Found): void {
  if (Array.isArray(filter)) {
    for (const one of filter) readFilter(description, table, one, found)
    return
  }
  if (!isStored(filter)) return
  if (typeof filter.col === 'string')
    for (const column of through(description, table, filter.col).columns) found.reads.add(column)
  for (const key of ['any', 'all']) readFilter(description, table, filter[key], found)
  if (typeof filter.col !== 'string') readFilter(description, table, filter.not, found)
  if (isStored(filter.in) && typeof filter.in.from === 'string') readPlan(description, filter.in, found)
}

/** Reads a stored plan: what it filters, sorts, picks, groups, sums, searches and measures, and the whole rows it reads. */
function readPlan(description: Description, plan: Stored, found: Found): void {
  const table = String(plan.from)
  const read = (path: string): void => {
    for (const column of through(description, table, path).columns) found.reads.add(column)
  }
  readFilter(description, table, plan.where, found)
  // A plan that counts reads its filter alone.
  if (plan.count === true) return
  if (plan.search !== undefined || plan.rank !== undefined) for (const one of searched(description, table)) read(one)
  for (const one of Array.isArray(plan.sort) ? plan.sort : [])
    if (isStored(one) && typeof one.by === 'string') read(one.by)
  for (const one of textList(plan.pick)) read(one)
  if (isStored(plan.near) && typeof plan.near.col === 'string') read(plan.near.col)
  const group = isStored(plan.group) ? plan.group : undefined
  if (group) {
    for (const one of textList(group.by)) read(one)
    for (const value of Object.values(isStored(group.values) ? group.values : {}))
      for (const column of Object.values(isStored(value) ? value : {})) if (typeof column === 'string') read(column)
  }
  const reached = textList(plan.with).map((link) => {
    const { columns, at } = through(description, table, link)
    for (const column of columns) found.reads.add(column)
    return at
  })
  // A plan that picks nothing hands on whole rows, of its table and of each table its `with` reaches.
  if (plan.pick === undefined && group === undefined) for (const one of [table, ...reached]) found.whole.add(one)
}

/** Reads each column that a stored value reads with `{ col }`, in the table that a write writes. */
function readValue(table: string, value: unknown, found: Found): void {
  if (Array.isArray(value)) {
    for (const one of value) readValue(table, one, found)
    return
  }
  if (!isStored(value)) return
  if (typeof value.col === 'string' && Object.keys(value).length === 1) found.reads.add(`${table}.${value.col}`)
  for (const inner of Object.values(value)) readValue(table, inner, found)
}

/** Reads a stored write: the columns of its values, those a value reads, and the rows a remove removes. */
function readWrite(write: Stored, found: Found): void {
  const table = String(write.add ?? write.change ?? write.remove)
  if (typeof write.remove === 'string') found.removes.add(table)
  for (const [column, value] of Object.entries(isStored(write.values) ? write.values : {})) {
    found.writes.add(`${table}.${column}`)
    readValue(table, value, found)
  }
}

/** The entries of an object that a body writes in place, by their keys: a value of any other form holds none. */
const entriesOf = (value: unknown): [string, unknown][] =>
  isStored(value) && Array.isArray(value.object)
    ? value.object.filter((one): one is [string, unknown] => Array.isArray(one) && typeof one[0] === 'string')
    : []

/** A filter as a body writes it, `{ status: 'open', any: [...] }`, in the stored form of a filter, by its columns. */
function filterOfWritten(value: unknown): Stored[] {
  if (Array.isArray(value)) return value.flatMap(filterOfWritten)
  return entriesOf(value).flatMap(([key, inner]): Stored[] =>
    key === 'any' || key === 'all' || key === 'not' ? filterOfWritten(inner) : [{ col: key }],
  )
}

/** A text or a list of texts that a body hands a member, as names. */
const namesHanded = (value: unknown): string[] => (typeof value === 'string' ? [value] : textList(value))

/**
 * Takes a chain of a body that starts at a table. Answers what it does as a stored plan or a stored write: each member
 * read as the word of a plan of the same name of `plan.ts` gives it.
 */
function chainAsStored(table: string, then: unknown[]): Stored {
  const plan: Stored = { from: table }
  const where: Stored[] = []
  const sort: Stored[] = []
  for (const member of then) {
    const [name, args] = isStored(member) ? (Object.entries(member)[0] ?? []) : []
    const handed = Array.isArray(args) ? args : []
    if (name === 'add') return { add: table, values: Object.fromEntries(entriesOf(handed[0])) }
    if (name === 'change') return { change: table, values: Object.fromEntries(entriesOf(handed[1])) }
    if (name === 'remove') return { remove: table }
    if (name === 'where' || name === 'count') where.push(...filterOfWritten(handed[0]))
    if (name === 'count') plan.count = true
    if (name === 'with') plan.with = [...textList(plan.with), ...handed.flatMap(namesHanded)]
    if (name === 'newest' || name === 'oldest') sort.push(...namesHanded(handed[0]).map((by) => ({ by })))
    if (name === 'sort') sort.push(...handed.flatMap(namesHanded).map((by) => ({ by: by.replace(/^-/, '') })))
    if (name === 'pick') plan.pick = [...textList(plan.pick), ...namesHanded(handed[0])]
    if (name === 'search' || name === 'rank') plan[name] = true
    if (name === 'near') plan.near = { col: namesHanded(handed[0])[0] }
    if (name === 'group') {
      const values = entriesOf(handed[1]).map(([key, value]) => [key, Object.fromEntries(entriesOf(value))])
      plan.group = { by: namesHanded(handed[0]), values: Object.fromEntries(values) }
    }
  }
  return { ...plan, ...(where.length ? { where: { all: where } } : {}), ...(sort.length ? { sort } : {}) }
}

/** Walks any stored node: each plan, write and chain of a body in it, at every depth. */
function readNode(description: Description, node: unknown, found: Found): void {
  if (Array.isArray(node)) {
    for (const one of node) readNode(description, one, found)
    return
  }
  if (!isStored(node)) return
  if (typeof node.from === 'string') {
    readPlan(description, node, found)
    return
  }
  if (typeof (node.add ?? node.change ?? node.remove) === 'string') {
    readWrite(node, found)
    return
  }
  const chain = isStored(node.plan) ? node.plan : undefined
  const table = chain && (typeof chain.db === 'string' ? chain.db : chain.table)
  if (typeof table === 'string' && Array.isArray(node.then)) {
    const stored = chainAsStored(table, node.then)
    if (typeof stored.from === 'string') readPlan(description, stored, found)
    else readWrite(stored, found)
  }
  for (const value of Object.values(node)) readNode(description, value, found)
}

/**
 * Takes a description and what to read: the record of a function, a flow or a table, a plan, a write, or a stored
 * body. Answers the columns it reads and writes, each named in the table that holds it, through links.
 */
export function columnsUsed(description: Description, of: unknown): ColumnsUsed {
  const found: Found = { reads: new Set(), writes: new Set(), whole: new Set(), removes: new Set() }
  let known = true
  const table = Object.entries(description.tables).find(([, record]) => record === of)?.[0]
  if (table !== undefined && isStored(of)) {
    // A table is read through the filter of each `where` rule and of `lasts`.
    for (const rule of Object.values(isStored(of.access) ? of.access : {}))
      if (isStored(rule) && rule.rule === 'where') readFilter(description, table, rule.filter, found)
    readFilter(description, table, Reflect.get(Object(of.lasts), 'where'), found)
  } else if (isStored(of) && typeof of.from !== 'string' && typeof (of.add ?? of.change ?? of.remove) !== 'string') {
    // A record is known by a stored plan, write or body alone: the `rows` that code is handed say nothing of what it does.
    const stored = [of.plan, of.writes, of.body, of.onFail]
    known = stored.some((one) => one !== undefined && !(isStored(one) && typeof one.module === 'string'))
    if (known) readNode(description, [...stored, isStored(of.rows) ? Object.values(of.rows) : undefined], found)
  } else readNode(description, of, found)
  const sorted = (set: Set<string>): string[] => (known ? [...set].sort() : [])
  return {
    reads: sorted(found.reads),
    writes: sorted(found.writes),
    whole: sorted(found.whole),
    removes: sorted(found.removes),
    known,
  }
}
