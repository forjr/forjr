import type { Description } from '../../core/internal.ts'
import { isStored } from '../../core/internal.ts'
import type { Reached } from './face.ts'
import { usesIn } from './graph.ts'

/**
 * Takes a description and the name of a definition that changed: a column as `<table>.<column>`, which walks from
 * its table, or any other definition. Answers everything that depends on it, as a tree: the walk of every edge in
 * of the graph, breadth first, each definition once in the whole tree under the first that reached it, and under
 * each the definitions that reach it in the order of their names. A name of no node reaches nothing.
 */
export function reachedBy(description: Description, name: string): Reached[] {
  const uses = usesIn(description)
  const owner = name.split('.')[0]
  const start = Object.hasOwn(description.tables, owner) ? owner : name
  if (!uses.nodes.has(start)) return []
  const reached = (one: string): Reached => {
    const node = uses.nodes.get(one)
    const offered = (node?.doors ?? []).filter((door) => door.startsWith('offered ')).map((door) => door.slice(8))
    const screen = description.screens[one]
    const cached = isStored(screen?.cache) && Reflect.get(screen.cache, 'public') === true
    return {
      name: one,
      kind: node?.kind ?? 'definition',
      ...(offered.length ? { offered } : {}),
      ...(cached ? { cached: true as const } : {}),
      under: [],
    }
  }
  const seen = new Set([start])
  const tree: Reached[] = []
  let level: [string, Reached[]][] = [[start, tree]]
  while (level.length) {
    const next: [string, Reached[]][] = []
    for (const [at, under] of level)
      for (const from of [...new Set(uses.in(at).map((one) => one.from))].sort()) {
        if (seen.has(from)) continue
        seen.add(from)
        const one = reached(from)
        under.push(one)
        next.push([from, one.under])
      }
    level = next
  }
  return tree
}

/** The word a reached definition is counted under: a function of each kind, a screen for a component too. */
const countedAs = (kind: string): string =>
  ['query', 'change', 'action', 'python'].includes(kind)
    ? 'function'
    : kind === 'component'
      ? 'screen'
      : kind === 'incoming'
        ? 'incoming call'
        : kind

/** Counts what a tree reaches: each definition once under its word, and its offers by door. */
export function countOf(tree: Reached[]): { kinds: Record<string, number>; offers: Record<string, number> } {
  const counted: { kinds: Record<string, number>; offers: Record<string, number> } = { kinds: {}, offers: {} }
  const walk = (one: Reached): void => {
    const word = countedAs(one.kind)
    counted.kinds[word] = (counted.kinds[word] ?? 0) + 1
    for (const door of one.offered ?? []) counted.offers[door] = (counted.offers[door] ?? 0) + 1
    for (const below of one.under) walk(below)
  }
  for (const one of tree) walk(one)
  return counted
}
