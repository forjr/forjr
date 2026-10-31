import type { ColumnsUsed } from '../columnsUsed.ts'
import { columnsUsed } from '../columnsUsed.ts'
import type { Description } from '../description.ts'
import type { Stored } from '../record.ts'
import { isStored } from '../record.ts'
import { ruleWords } from '../ruleWords.ts'
import type { TestsTouched } from '../tested.ts'
import { testedKinds, testsTouching } from '../tested.ts'
import { tokenCount } from '../tokens.ts'
import type { EdgeKind, SeenInCode, UseKind, UseNode, Uses } from '../uses.ts'
import { edgeKinds, usesOf } from '../uses.ts'
import type { PageBytes } from './page.ts'
import { firstLines, lineText } from './text.ts'
import { weighed } from './weigh.ts'

/** What the map is made from: the description, and what was read beside it. */
export interface MapInput {
  description: Description
  seen?: SeenInCode
  // `linesOf`; `text` left out where it is not shown.
  at?: Record<string, { file: string; line: number; last: number; text?: string }>
  // `filesImported`
  imports?: Record<string, string[]>
  // `touchedIn`; left out where the tests never ran.
  tests?: TestsTouched
  // Left out where no release build was made.
  page?: PageBytes | 'unbuilt'
  // A workspace described in its box.
  box?: true
}

/** One edge of a line: its kind, the other definition, and whether it was seen in code. */
export interface MapEdge {
  kind: EdgeKind
  name: string
  by: 'known' | 'seen'
}

/** One definition as the map says it, as data. */
export interface MapLine {
  // An event and a package with no `event:` or `package:`.
  name: string
  kind: UseKind
  file?: string
  line?: number
  // In words; of a table, its four rules.
  rule?: string
  narrowing?: string[]
  doors: string[]
  // Of a table, each column in the words of its line.
  columns?: string[]
  // A package that reaches a browser, a screen, a component a browser loads.
  browser?: { bytes?: number; files?: Record<string, number> }
  // Of a flow, each trigger of its `on` in words; of a package, the files of the project that use it and its ways out.
  on?: string[]
  files?: string[]
  reaches?: string[]
  // In the order of the kinds of edge, and within a kind of weight.
  out: MapEdge[]
  in: MapEdge[]
  // Of a function and a flow where `known`, and of a table, by the filters of its rules.
  used?: ColumnsUsed
  // The columns `SeenInCode` saw set.
  sets?: string[]
  code: boolean
  // By `<file>: <name>`; left out for a kind no test names, and where the tests never ran.
  tests?: string[]
  // Its share by `weighed`.
  weight: number
}

/** The map of an app: its first line as data, and the line of each definition. */
export interface AppMap {
  app: string
  // The style files every page loads, each with its bytes.
  styles?: Record<string, number>
  hold?: { net: string[]; programs: string[]; native: string[] }
  page: 'built' | 'unbuilt' | 'none'
  // Whether a record of the tests was read.
  tests: boolean
  box: boolean
  // In the order of their weight, cut as the text is.
  lines: MapLine[]
  // How many were left out by the size.
  more: number
}

// The order in which the nodes are handed to the weighing: each group of kinds in its turn, within it by the names.
const kindGroups: UseKind[][] = [
  ['table'],
  ['query', 'change', 'action', 'python'],
  ['screen'],
  ['flow', 'agent'],
  ['component'],
  ['route', 'command', 'incoming'],
  ['service', 'model'],
  ['backfill'],
  ['event'],
  ['package'],
]

// The kinds of a function.
const functionKinds = new Set(['query', 'change', 'action', 'python'])

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((one) => typeof one === 'string') : []

/** The name a node is shown by: an event and a package without what marks them in the graph. */
const shownName = (name: string): string => name.replace(/^(?:event|package):/, '')

/** A column of a table in the words of its line: its name, `?` where a row may leave it out, its link or its values. */
export function columnWords(name: string, type: unknown): string {
  const column = isStored(type) ? type : {}
  const left = column.optional === true || column.default !== undefined ? '?' : ''
  if (column.kind === 'link' && typeof column.table === 'string') return `${name}${left} (${column.table})`
  if (column.kind === 'choice') return `${name}${left} ${textList(column.values).join('|')}`
  return `${name}${left}`
}

/** The four rules of a table in words, those that let nobody in left out, and `nobody` where all four do. */
function tableRule(table: Stored): string {
  const access = isStored(table.access) ? table.access : {}
  const rules = ['read', 'add', 'change', 'remove'].flatMap((what) => {
    const words = ruleWords(access[what])
    return words === 'nobody' ? [] : [`${what} ${words}`]
  })
  return rules.length ? rules.join(', ') : 'nobody'
}

/** A trigger of a flow in words: a table with its change as stored, an event, an incoming call, a schedule. */
function triggerWords(trigger: unknown): string[] {
  if (!isStored(trigger)) return []
  if (typeof trigger.table === 'string') return [`${trigger.table} ${String(trigger.when)}`]
  if (typeof trigger.event === 'string') return [`event ${trigger.event}`]
  if (typeof trigger.incoming === 'string') return [`incoming ${trigger.incoming}`]
  return []
}

/** The stored record of a node of the graph, by its kind. */
function recordOf(description: Description, node: UseNode): Stored {
  const part: Record<string, string> = {
    table: 'tables',
    query: 'functions',
    change: 'functions',
    action: 'functions',
    python: 'functions',
    flow: 'flows',
    agent: 'flows',
    screen: 'screens',
    component: 'components',
    service: 'services',
    model: 'models',
    route: 'routes',
    incoming: 'incoming',
    command: 'commands',
    backfill: 'backfills',
  }
  const held: unknown = Reflect.get(description, part[node.kind] ?? '')
  const record: unknown = isStored(held) ? held[node.name] : undefined
  return isStored(record) ? record : {}
}

/** One definition's line as data, from the graph and what was read beside the description. */
function lineOf(o: MapInput, uses: Uses, node: UseNode, weight: number, rank: Map<string, number>): MapLine {
  const { description } = o
  const record = recordOf(description, node)
  const at = o.at?.[node.name]
  const place: unknown = Reflect.get(Object(description.places), node.name)
  const placed: unknown = Reflect.get(Object(place), 'file')
  const file = at?.file ?? (typeof placed === 'string' ? placed : undefined)
  const kind = node.kind
  const edgesOf = (
    list: { kind: EdgeKind; from: string; to: string; by: 'known' | 'seen' }[],
    side: 'from' | 'to',
  ): MapEdge[] =>
    list
      .map((one) => ({ kind: one.kind, name: one[side], by: one.by }))
      .sort(
        (a, b) =>
          edgeKinds.indexOf(a.kind) - edgeKinds.indexOf(b.kind) || (rank.get(a.name) ?? 0) - (rank.get(b.name) ?? 0),
      )
      .map((one) => ({ ...one, name: shownName(one.name) }))
  const agent = isStored(record.agent) ? record.agent : undefined
  const rule = ['query', 'change', 'action', 'python', 'flow', 'screen', 'component', 'route', 'command'].includes(kind)
    ? ruleWords(record.access)
    : kind === 'agent'
      ? ruleWords(agent?.access)
      : kind === 'table'
        ? tableRule(record)
        : undefined
  const narrowing: string[] = []
  if (kind === 'table') {
    if (typeof record.owner === 'string') narrowing.push(`owner ${record.owner}`)
    if (typeof record.tenant === 'string') narrowing.push(`tenant ${record.tenant}`)
    for (const [name, type] of Object.entries(isStored(record.columns) ? record.columns : {}))
      if (isStored(type) && type.read !== undefined) narrowing.push(`${name} read ${ruleWords(type.read)}`)
  }
  if (functionKinds.has(kind) && record.danger === 'ask') narrowing.push('danger ask')
  if (functionKinds.has(kind) && record.sends === false) narrowing.push('sends no')
  const page = o.page === undefined || o.page === 'unbuilt' ? undefined : o.page
  const packageOf = kind === 'package' ? description.packages?.[shownName(node.name)] : undefined
  let browser: MapLine['browser']
  if (packageOf?.browser === true) browser = page ? { bytes: page.packages[shownName(node.name)] ?? 0 } : {}
  const files = page?.views[node.name]
  if ((kind === 'screen' || kind === 'component') && files)
    browser = { bytes: Object.values(files).reduce((sum, n) => sum + n, 0), files }
  const used =
    kind === 'table' || ['query', 'change', 'action', 'python', 'flow', 'agent'].includes(kind)
      ? columnsUsed(description, record)
      : undefined
  const sets = o.seen?.[node.name]?.sets ?? []
  const by = textList(packageOf?.by)
  const usedBy = by.filter((one) => /^(?:backend|file):/.test(one)).map((one) => one.slice(one.indexOf(':') + 1))
  return {
    name: shownName(node.name),
    kind,
    ...(file === undefined ? {} : { file }),
    ...(at ? { line: at.line } : {}),
    ...(rule === undefined ? {} : { rule }),
    ...(narrowing.length ? { narrowing } : {}),
    doors: node.doors,
    ...(kind === 'table'
      ? {
          columns: Object.entries(isStored(record.columns) ? record.columns : {}).map(([name, type]) =>
            columnWords(name, type),
          ),
        }
      : {}),
    ...(browser ? { browser } : {}),
    ...(kind === 'flow' || kind === 'agent'
      ? { on: (Array.isArray(record.on) ? record.on : []).flatMap(triggerWords) }
      : {}),
    ...(usedBy.length ? { files: [...usedBy].sort() } : {}),
    ...(textList(packageOf?.out).length ? { reaches: textList(packageOf?.out) } : {}),
    out: edgesOf(uses.out(node.name), 'to'),
    in: edgesOf(uses.in(node.name), 'from'),
    ...(used?.known ? { used } : {}),
    ...(sets.length ? { sets } : {}),
    code: node.code,
    ...(o.tests && testedKinds.has(kind) ? { tests: testsTouching(o.tests, node.name) } : {}),
    weight,
  }
}

/**
 * Takes what the map is made from. Answers the graph and the line of every definition as data, the heaviest first:
 * weighed from the graph alone, a door the start of the walk, so one description and one record of what was seen
 * give one order.
 */
export function mapLines(o: MapInput): { uses: Uses; lines: MapLine[]; byNode: Map<string, MapLine> } {
  const uses = usesOf(o.description, o.seen)
  const nodes = kindGroups.flatMap((kinds) =>
    [...uses.nodes.values()]
      .filter((one) => kinds.includes(one.kind))
      .map((one) => one.name)
      .sort(),
  )
  const pairs = new Map<string, [string, string]>()
  for (const name of nodes) for (const one of uses.out(name)) pairs.set(`${one.from}\0${one.to}`, [one.from, one.to])
  const doors = nodes.filter((name) => uses.nodes.get(name)?.doors.length)
  const order = weighed({ nodes, edges: [...pairs.values()], doors })
  const rank = new Map(order.map((one, at) => [one.name, at]))
  const byNode = new Map<string, MapLine>()
  for (const { name, weight } of order) {
    const node = uses.nodes.get(name)
    if (node) byNode.set(name, lineOf(o, uses, node, weight, rank))
  }
  return { uses, lines: [...byNode.values()], byNode }
}

/** What the project's `hold` names, as the first line says it: each way with its names. */
function holdOf(description: Description): AppMap['hold'] {
  const hold = description.project.hold
  if (hold === true) return { net: [], programs: [], native: [] }
  if (!isStored(hold)) return undefined
  return { net: textList(hold.net), programs: textList(hold.programs), native: textList(hold.native) }
}

/**
 * Takes what the map is made from and its size in tokens, 1,500 where none is given, or `'all'`. Answers the map of
 * the app: its first line as data, and the line of each definition in the order of its weight, each kept while the
 * text with it stays within the size by `tokenCount`, with how many were left out.
 */
export function mapOf(o: MapInput & { size?: number | 'all' }): AppMap {
  const { lines } = mapLines(o)
  const page = o.page === undefined ? undefined : o.page === 'unbuilt' ? undefined : o.page
  const hold = holdOf(o.description)
  const head: AppMap = {
    app: o.description.app.name,
    ...(page && Object.keys(page.styles).length ? { styles: page.styles } : {}),
    ...(hold ? { hold } : {}),
    page: o.page === undefined ? 'none' : o.page === 'unbuilt' ? 'unbuilt' : 'built',
    tests: o.tests !== undefined,
    box: o.box === true,
    lines: [],
    more: 0,
  }
  const size = o.size ?? 1500
  let text = firstLines(head).join('\n')
  for (const line of lines) {
    const next = `${text}\n${lineText(line, false)}`
    if (size !== 'all' && tokenCount(next) > size) break
    head.lines.push(line)
    text = next
  }
  return { ...head, more: lines.length - head.lines.length }
}
