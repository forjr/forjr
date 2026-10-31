import { columnsUsed } from './columnsUsed.ts'
import { definitionsOf } from './definitions.ts'
import type { Description } from './description.ts'
import { callsIn, toolsOf } from './reaching.ts'
import type { Stored } from './record.ts'
import { isStored } from './record.ts'

/** The kind of a definition as the graph and the policy of a workspace name it, with a backfill, an event and a package. */
export type UseKind =
  | 'table'
  | 'query'
  | 'change'
  | 'action'
  | 'python'
  | 'flow'
  | 'agent'
  | 'screen'
  | 'component'
  | 'service'
  | 'model'
  | 'route'
  | 'incoming'
  | 'command'
  | 'backfill'
  | 'event'
  | 'package'

/** What one definition does with another, named from the side of the definition that holds the field. */
export type EdgeKind =
  | 'reads'
  | 'writes'
  | 'ruleReads'
  | 'links'
  | 'asks'
  | 'calls'
  | 'starts'
  | 'draws'
  | 'uses'
  | 'holds'
  | 'model'
  | 'service'
  | 'memory'
  | 'on'
  | 'emits'
  | 'filledBy'
  | 'keeps'
  | 'backfills'
  | 'imports'

/** One edge: `from` does `kind` with `to`; `known` from a field the description states, `seen` where the build read it from code. */
export interface Use {
  from: string
  to: string
  kind: EdgeKind
  by: 'known' | 'seen'
}

/** One node: its name, its kind, the doors that reach it from outside, and whether code of it may reach more than its edges. */
export interface UseNode {
  name: string
  kind: UseKind
  doors: string[]
  code: boolean
}

/** The graph: every node by its name, and the edges of each, out and in, in the order of the names they lead to. */
export interface Uses {
  nodes: Map<string, UseNode>
  out(name: string): Use[]
  in(name: string): Use[]
}

/** What the build read from the code of each code definition, by its name (`seenInCode` of `build`). */
export type SeenInCode = Record<
  string,
  {
    reads: string[]
    writes: string[]
    sets: string[]
    calls: string[]
    starts: string[]
    emits: string[]
  }
>

// The kinds of edge in their order: the order of two edges between the same two nodes, and of the edges of a line
// of the map, as the words of an edge stand.
export const edgeKinds: readonly EdgeKind[] = [
  'reads',
  'writes',
  'ruleReads',
  'links',
  'asks',
  'calls',
  'starts',
  'draws',
  'uses',
  'holds',
  'model',
  'service',
  'memory',
  'on',
  'emits',
  'filledBy',
  'keeps',
  'backfills',
  'imports',
]

// The kinds of a definition that `definitionsOf` answers, which are nodes: all but the project.
const definitionKinds: UseKind[] = [
  'table',
  'query',
  'change',
  'action',
  'python',
  'flow',
  'agent',
  'screen',
  'component',
  'service',
  'model',
  'route',
  'incoming',
  'command',
]
const isUseKind = (kind: string): kind is UseKind => definitionKinds.some((one) => one === kind)

// The kinds whose code may reach more than their edges name, beside a function and a flow written as code.
const alwaysCode = new Set(['agent', 'python', 'route', 'command', 'backfill', 'screen', 'component'])

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((one) => typeof one === 'string') : []
const textOf = (value: unknown): string[] => (typeof value === 'string' ? [value] : [])
const records = (value: unknown): Stored[] => (Array.isArray(value) ? value.filter(isStored) : [])
const of = (value: unknown, key: string): unknown => (isStored(value) ? value[key] : undefined)

/** The doors of a definition: its offers, its address, its route, its command, and the schedule of a flow. */
function doorsOf(kind: string, name: string, record: Stored): string[] {
  const doors: string[] = []
  if (kind === 'screen')
    doors.push(...(typeof record.path === 'string' ? [record.path] : textOf(record.for).map((one) => `for ${one}`)))
  if (kind === 'route') {
    const methods = typeof record.method === 'string' ? [record.method] : textList(record.method)
    doors.push(...methods.map((method) => `${method} ${String(record.path)}`))
  }
  if (kind === 'incoming') doors.push(...textOf(record.path))
  if (kind === 'command') doors.push(`command ${name}`)
  doors.push(...textList(record.offer).map((door) => `offered ${door}`))
  for (const trigger of records(record.on)) {
    if (typeof trigger.every === 'string') doors.push(`every ${trigger.every}`)
    if (typeof trigger.cron === 'string') doors.push(`cron ${trigger.cron}`)
  }
  return doors
}

/** The rules a record states: its `access`, an agent's, and each of the rules of a table. */
const rulesOf = (record: Stored): unknown[] => [
  record.access,
  of(record.agent, 'access'),
  ...Object.values(isStored(record.access) && record.access.rule === undefined ? record.access : {}),
]

/**
 * Takes a description and, where the code was read, what was seen in it. Answers the graph of who uses what: a node
 * for each definition, backfill and package, and for each event an edge names, with an edge for each field that
 * leads from one to another. A name of an event is `event:<name>` and of a package `package:<name>`, so neither
 * meets a definition's name.
 */
export function usesOf(description: Description, seen: SeenInCode = {}): Uses {
  const nodes = new Map<string, UseNode>()
  const add = (name: string, kind: UseKind, record: Stored): void => {
    const code =
      alwaysCode.has(kind) ||
      (['query', 'change', 'action', 'flow'].includes(kind) && record.form === 'code') ||
      rulesOf(record).some((rule) => typeof of(rule, 'module') === 'string')
    nodes.set(name, { name, kind, doors: doorsOf(kind, name, record), code })
  }
  for (const [name, placed] of definitionsOf(description))
    if (isUseKind(placed.kind)) add(name, placed.kind, placed.record)
  for (const [name, record] of Object.entries(description.backfills ?? {})) add(name, 'backfill', record)
  for (const name of Object.keys(description.packages ?? {})) add(`package:${name}`, 'package', {})

  const edges = new Map<string, Use>()
  /** The node a name leads to: itself, or `<name>` of `<name>.<member>`; an event is made by the edge that names it. */
  const target = (name: string): string | undefined => {
    if (name.startsWith('event:')) {
      if (!nodes.has(name)) nodes.set(name, { name, kind: 'event', doors: [], code: false })
      return name
    }
    if (nodes.has(name)) return name
    const owner = name.split('.')[0]
    return owner !== name && nodes.has(owner) ? owner : undefined
  }
  const edge = (from: string, kind: EdgeKind, to: string, by: 'known' | 'seen' = 'known'): void => {
    const lead = nodes.has(from) ? target(to) : undefined
    if (lead === undefined) return
    const key = `${from}\0${kind}\0${lead}`
    // Two fields that lead to one node with one kind make one edge, and what the description states wins.
    if (edges.get(key)?.by === 'known') return
    edges.set(key, { from, to: lead, kind, by })
  }

  for (const [name, table] of Object.entries(description.tables)) {
    for (const reached of textList(table.reaches)) edge(name, 'ruleReads', reached)
    for (const column of Object.values(isStored(table.columns) ? table.columns : {})) {
      if (!isStored(column)) continue
      const link = column.kind === 'list' && isStored(column.of) ? column.of : column
      if (link.kind === 'link') for (const linked of textOf(link.table)) edge(name, 'links', linked)
      if (column.kind === 'vector') for (const model of textOf(column.model)) edge(name, 'model', model)
      for (const work of textOf(of(column.by, 'work'))) edge(name, 'filledBy', work)
      for (const kept of textOf(of(column.keeps, 'of'))) edge(name, 'keeps', kept)
    }
  }

  /** The edges of what a function, a flow or an agent states it reads, writes, calls, starts and emits. */
  const bodyEdges = (name: string, record: Stored): void => {
    for (const table of textList(record.reads)) edge(name, 'reads', table)
    for (const plan of Object.values(isStored(record.rows) ? record.rows : {}))
      edge(name, 'reads', String(of(plan, 'from')))
    for (const table of textList(record.touches)) edge(name, 'writes', table)
    const used = columnsUsed(description, record)
    for (const column of [...used.reads, ...used.whole]) edge(name, 'reads', column)
    for (const column of [...used.writes, ...used.removes]) edge(name, 'writes', column)
    for (const call of callsIn([record.body, record.writes, record.onFail])) {
      if (call.kind === 'function') edge(name, 'calls', call.name)
      if (call.kind === 'model') edge(name, 'model', call.name)
      if (call.kind === 'service') edge(name, 'service', call.name)
      // A flow that a body starts or calls is started, but a member of a flow and an agent are called.
      if (call.kind === 'flow') {
        const agent = isStored(description.flows[call.name]?.agent)
        edge(name, agent || call.member !== undefined ? 'calls' : 'starts', call.name)
      }
    }
    for (const event of emitsIn([record.body, record.onFail])) edge(name, 'emits', `event:${event}`)
  }
  for (const [name, fn] of Object.entries(description.functions)) {
    bodyEdges(name, fn)
    for (const used of textList(fn.uses)) edge(name, 'uses', used)
    for (const reached of textList(fn.reaches)) edge(name, 'ruleReads', reached)
  }
  for (const [name, flow] of Object.entries(description.flows)) {
    bodyEdges(name, flow)
    for (const trigger of records(flow.on)) {
      for (const table of textOf(trigger.table)) edge(name, 'on', table)
      for (const event of textOf(trigger.event)) edge(name, 'on', `event:${event}`)
      for (const call of textOf(trigger.incoming)) edge(name, 'on', call)
    }
    const agent = isStored(flow.agent) ? flow.agent : undefined
    if (!agent) continue
    for (const tool of toolsOf(agent)) edge(name, 'holds', tool)
    for (const other of textList(agent.handsOver)) edge(name, 'holds', other)
    const memory = isStored(agent.memory) ? agent.memory : {}
    for (const table of textOf(memory.in)) edge(name, 'memory', table)
    for (const model of [...textOf(memory.model), ...textOf(agent.model)]) edge(name, 'model', model)
    for (const shrink of [of(memory.shrink, 'function'), of(memory.shrink, 'flow')])
      for (const one of textOf(shrink)) edge(name, 'holds', one)
    const guards = isStored(agent.guards) ? agent.guards : {}
    for (const guard of [
      ...(Array.isArray(guards.in) ? guards.in : []),
      ...(Array.isArray(guards.out) ? guards.out : []),
    ]) {
      for (const one of textOf(guard)) edge(name, 'holds', one)
      for (const model of textOf(of(of(guard, 'judge'), 'model'))) edge(name, 'model', model)
    }
    for (const model of textOf(of(of(of(agent.score, 'with'), 'judge'), 'model'))) edge(name, 'model', model)
  }

  for (const part of ['screens', 'components'] as const)
    for (const [name, view] of Object.entries(description[part])) {
      const data = isStored(view.data) ? view.data : {}
      for (const entry of Object.values(data))
        for (const asked of [...textOf(of(entry, 'query')), ...textOf(of(entry, 'action'))]) edge(name, 'asks', asked)
      for (const asked of textOf(of(of(view.seo, 'addresses'), 'query'))) edge(name, 'asks', asked)
      // What a view calls the build read from its imports, and wrote into the description.
      for (const called of textList(view.calls)) edge(name, 'calls', called, 'seen')
      for (const drawn of [...textList(view.uses), ...textOf(view.loading), ...textOf(view.layout)])
        edge(name, 'draws', drawn)
    }

  for (const [name, model] of Object.entries(description.models)) {
    for (const fallback of textList(model.fallback)) edge(name, 'model', fallback)
    for (const service of [...textOf(of(model.call, 'service')), ...textOf(of(of(model.job, 'check'), 'service'))])
      edge(name, 'service', service)
  }
  for (const [name, incoming] of Object.entries(description.incoming))
    for (const flow of textOf(incoming.then)) edge(name, 'starts', flow)
  for (const [name, backfill] of Object.entries(description.backfills ?? {}))
    for (const table of textOf(backfill.table)) edge(name, 'backfills', table)
  for (const [name, used] of Object.entries(description.packages ?? {}))
    for (const by of textList(used.by)) {
      const [side, view] = [by.split(':')[0], by.slice(by.indexOf(':') + 1)]
      if (side === 'screen' || side === 'component') edge(view, 'imports', `package:${name}`)
    }

  for (const [name, one] of Object.entries(seen)) {
    for (const table of one.reads) edge(name, 'reads', table, 'seen')
    for (const table of one.writes) edge(name, 'writes', table, 'seen')
    for (const called of one.calls) edge(name, 'calls', called, 'seen')
    for (const flow of one.starts) edge(name, 'starts', flow, 'seen')
    for (const event of one.emits) edge(name, 'emits', `event:${event}`, 'seen')
  }

  const outs = new Map<string, Use[]>()
  const ins = new Map<string, Use[]>()
  for (const use of edges.values()) {
    outs.set(use.from, [...(outs.get(use.from) ?? []), use])
    ins.set(use.to, [...(ins.get(use.to) ?? []), use])
  }
  const ordered =
    (side: 'from' | 'to') =>
    (a: Use, b: Use): number =>
      a[side] < b[side] ? -1 : a[side] > b[side] ? 1 : edgeKinds.indexOf(a.kind) - edgeKinds.indexOf(b.kind)
  for (const list of outs.values()) list.sort(ordered('to'))
  for (const list of ins.values()) list.sort(ordered('from'))
  return { nodes, out: (name) => outs.get(name) ?? [], in: (name) => ins.get(name) ?? [] }
}

/** Each event that a stored body emits by a name written as text. */
function emitsIn(node: unknown, found: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const one of node) emitsIn(one, found)
    return found
  }
  if (!isStored(node)) return found
  const args = Array.isArray(node.args) ? node.args : []
  if (node.fn === 'emit' && typeof args[0] === 'string') found.push(args[0])
  for (const value of Object.values(node)) emitsIn(value, found)
  return found
}
