import type { EdgeKind } from '../uses.ts'
import { edgeKinds } from '../uses.ts'
import type { AppMap, MapEdge, MapLine } from './lines.ts'
import type { MapColumn, MapFile, MapHelper, MapOne } from './one.ts'

/** Each answer of `forjr map`: the app, one definition, one column, one file of definitions, or a helper. */
export type MapAnswer = AppMap | MapOne | MapColumn | MapFile | MapHelper

// The words of each kind of edge, out and in.
const edgeWords: Record<EdgeKind, [string, string]> = {
  reads: ['reads', 'read by'],
  writes: ['writes', 'written by'],
  ruleReads: ['rule reads', 'read by the rule of'],
  links: ['links to', 'linked from'],
  asks: ['asks', 'asked by'],
  calls: ['calls', 'called by'],
  starts: ['starts', 'started by'],
  draws: ['draws', 'drawn by'],
  uses: ['uses', 'used by'],
  holds: ['holds', 'held by'],
  model: ['model', 'model of'],
  service: ['service', 'service of'],
  memory: ['keeps memory in', 'memory of'],
  on: ['on', 'wakes'],
  emits: ['emits', 'emitted by'],
  filledBy: ['filled by', 'fills'],
  keeps: ['keeps', 'kept by'],
  backfills: ['backfills', 'backfilled by'],
  imports: ['imports', 'imported by'],
}

/** The words of an edge, out or in. */
const wordsOfEdge = (kind: EdgeKind, side: 'out' | 'in'): string => edgeWords[kind][side === 'out' ? 0 : 1]

/** A group of names: at most four where it is cut, then how many more. */
function group(names: string[], whole: boolean): string {
  if (whole || names.length <= 4) return names.join(', ')
  return `${names.slice(0, 4).join(', ')} and ${names.length - 4} more`
}

/** The mark of an edge that was seen in the code. */
const seenMark = (edge: MapEdge): string => (edge.by === 'seen' ? '~' : '')

/** An edge's other definition by its name, with `~` where it was seen in the code. */
const named = (edge: MapEdge): string => `${seenMark(edge)}${edge.name}`

/** The fields of a function's or a flow's reads and writes: by their columns where known, else by their tables. */
function readsAndWrites(line: MapLine, whole: boolean): string[] {
  const fields: string[] = []
  const used = line.used
  if (used && line.kind !== 'table') {
    const tables = new Set(used.whole)
    const read = [
      ...used.whole.map((table) => `${table}.*`),
      ...used.reads.filter((one) => !tables.has(one.split('.')[0])),
    ]
    if (read.length) fields.push(`reads ${group(read.sort(), whole)}`)
    if (used.writes.length) fields.push(`writes ${group(used.writes, whole)}`)
    if (used.removes.length) fields.push(`removes ${group(used.removes, whole)}`)
    return fields
  }
  const reads = line.out.filter((one) => one.kind === 'reads').map(named)
  if (reads.length) fields.push(`reads ${group(reads, whole)}`)
  // A column the code was seen to set stands in place of its table.
  const writes = line.out
    .filter((one) => one.kind === 'writes')
    .flatMap((one) => {
      const set = (line.sets ?? []).filter((column) => column.split('.')[0] === one.name)
      return set.length ? set.map((column) => `~${column}`) : [named(one)]
    })
  if (writes.length) fields.push(`writes ${group(writes, whole)}`)
  return fields
}

/**
 * Takes a line of the map, and whether its groups are whole. Answers its text: its kind and name, its file and line,
 * its rule, its narrowing, its doors, its columns, its bytes in the browser, its edges out and in by kind, its tests,
 * and `code` where its code may reach more; two spaces between them, a field that holds nothing left out.
 */
export function lineText(line: MapLine, whole: boolean): string {
  const fields = [`${line.kind} ${line.name}`]
  if (line.file !== undefined) fields.push(line.line === undefined ? line.file : `${line.file}:${line.line}`)
  if (line.rule !== undefined) fields.push(line.rule)
  if (line.narrowing?.length) fields.push(line.narrowing.join(', '))
  if (line.doors.length) fields.push(line.doors.join(', '))
  if (line.columns?.length) fields.push(line.columns.join(', '))
  if (line.browser) fields.push(line.browser.bytes === undefined ? 'browser' : `browser ${line.browser.bytes} bytes`)
  if (line.files?.length) fields.push(`files ${group(line.files, whole)}`)
  if (line.reaches?.length) fields.push(`reaches ${line.reaches.join(', ')}`)
  for (const kind of edgeKinds) {
    if (kind === 'reads') fields.push(...readsAndWrites(line, whole))
    if (kind === 'reads' || kind === 'writes') continue
    if (kind === 'on' && line.on) {
      if (line.on.length) fields.push(`on ${group(line.on, whole)}`)
      continue
    }
    const names = line.out.filter((one) => one.kind === kind).map(named)
    if (names.length) fields.push(`${wordsOfEdge(kind, 'out')} ${group(names, whole)}`)
  }
  for (const kind of edgeKinds) {
    const names = line.in.filter((one) => one.kind === kind).map(named)
    if (names.length) fields.push(`${wordsOfEdge(kind, 'in')} ${group(names, whole)}`)
  }
  if (line.tests)
    fields.push(line.tests.length === 1 ? '1 test' : line.tests.length ? `${line.tests.length} tests` : 'no test')
  if (line.code) fields.push('code')
  return fields.join('  ')
}

/** The first two lines of the map of an app: its name with what holds of it, and what `~` and `code` mean. */
export function firstLines(map: AppMap): string[] {
  const first = [map.app]
  const styles = Object.values(map.styles ?? {})
  if (styles.length) first.push(`browser styles ${styles.reduce((sum, n) => sum + n, 0)} bytes`)
  if (map.hold) {
    const ways = (['net', 'programs', 'native'] as const).flatMap((way) =>
      map.hold?.[way].length ? [`${way} ${map.hold[way].join(', ')}`] : [],
    )
    first.push(ways.length ? `hold ${ways.join('; ')}` : 'hold nothing named')
  }
  if (map.page === 'unbuilt') first.push('no page bytes: it does not build for release')
  if (map.page === 'none') first.push('no page bytes')
  if (!map.tests) first.push('no test record: run forjr test')
  if (map.box) first.push('in its box: nothing seen in the code')
  return [first.join('  '), '~ seen in the code; code: its code may reach more than is named']
}

/** A heading with the lines under it, two spaces in, or nothing where it holds none. */
const under = (heading: string, lines: string[]): string[] =>
  lines.length ? [heading, ...lines.map((one) => `  ${one}`)] : []

/** Takes an answer of `forjr map`. Answers its text: what the command prints with no `--json`. */
export function mapText(answer: MapAnswer): string {
  if ('app' in answer)
    return [
      ...firstLines(answer),
      ...answer.lines.map((line) => lineText(line, false)),
      ...(answer.more ? [`${answer.more} more: forjr map --all, or forjr map <name>`] : []),
    ].join('\n')
  if ('near' in answer) {
    const { line } = answer
    const near = new Map(answer.near.map((one) => [`${one.kind} ${one.name}`, one]))
    const nearOf = (edge: MapEdge): string => {
      const found = [...near.values()].find((one) => one.name === edge.name)
      return found ? lineText(found, false) : edge.name
    }
    const used = line.used
    const columns = used
      ? [
          ...(used.reads.length || used.whole.length
            ? [
                `columns read ${[...used.whole.map((table) => `${table}.*`), ...used.reads.filter((one) => !used.whole.includes(one.split('.')[0]))].sort().join(', ')}`,
              ]
            : []),
          ...(used.writes.length ? [`columns written ${used.writes.join(', ')}`] : []),
          ...(used.removes.length ? [`rows removed ${used.removes.join(', ')}`] : []),
        ]
      : []
    return [
      lineText(line, true),
      ...(line.file !== undefined && line.line !== undefined ? [`${line.file}:${line.line}-${answer.last}`] : []),
      ...(answer.text ? answer.text.split('\n').map((one) => `    ${one}`) : []),
      ...columns,
      ...Object.entries(line.browser?.files ?? {}).map(([file, bytes]) => `browser ${file} ${bytes} bytes`),
      ...line.out.map((edge) => `${wordsOfEdge(edge.kind, 'out')} ${seenMark(edge)}${nearOf(edge)}`),
      ...line.in.map((edge) => `${wordsOfEdge(edge.kind, 'in')} ${seenMark(edge)}${nearOf(edge)}`),
      ...(line.tests ?? []).map((one) => `test ${one}`),
    ].join('\n')
  }
  if ('column' in answer)
    return [
      `${answer.column}  ${answer.words}`,
      ...under(
        'read by',
        answer.reads.map((one) => lineText(one, false)),
      ),
      ...under(
        'written by',
        answer.writes.map((one) => lineText(one, false)),
      ),
      ...under(
        'may reach it, by code',
        answer.mayReach.map((one) => lineText(one, false)),
      ),
    ].join('\n')
  if ('lines' in answer) return [answer.file, ...answer.lines.map((one) => lineText(one, false))].join('\n')
  return [
    `${answer.file}  no definition`,
    ...under('imports', answer.imports),
    ...under('imported by', answer.importedBy),
  ].join('\n')
}
