import type { Description, SeenInCode } from '../core/internal.ts'
import { scanned } from './lookups.ts'
import type { Source } from './projectSource.ts'
import { namedFile } from './source.ts'
import type { Node } from './tree.ts'
import { kid, kids, nameOf, walk, word } from './tree.ts'

const isMember = (node: Node | undefined): boolean =>
  (node?.type === 'MemberExpression' || node?.type === 'StaticMemberExpression') && node.computed !== true

/** The name of the member that a member expression reads, where it is written as a name. */
const memberName = (node: Node | undefined): string | undefined =>
  isMember(node) ? word(kid(node, 'property'), 'name') : undefined

/** Whether a node is `db`: the name, or a member `db` of something, as `o.db`. */
const isDb = (node: Node | undefined): boolean => nameOf(node) === 'db' || memberName(node) === 'db'

/**
 * Takes a node of a tree. Answers the table that a member `db.<table>` or `db.system.<table>` names, or nothing for
 * any other node: the one reading of a member of `db`, which the check reads too.
 */
export function tableOfMember(node: Node): string | undefined {
  const table = memberName(node)
  if (table === undefined || table === 'system') return undefined
  const from = kid(node, 'object')
  return isDb(from) || (memberName(from) === 'system' && isDb(kid(from, 'object'))) ? table : undefined
}

// The words of a body that write a row, and the place among their arguments of the values they write.
const writing: Record<string, number> = { add: 0, change: 1, remove: -1 }

/** What a name of a file stands for: a definition by its name, or a word of `forjr` by its own. */
type Meant = { definition: string } | { word: string }

/** What each name that a file reads stands for: the definitions it imports or declares, and `start` and `emit`. */
function meaningsOf(source: Source, path: string, byFile: Map<string, string>): Map<string, Meant> {
  const file = source[path]
  const meant = new Map<string, Meant>()
  if (!file.tree) return meant
  const scan = scanned(file.tree)
  for (const one of scan.declared) meant.set(one.exportName, { definition: one.name ?? one.exportName })
  for (const taken of scan.imports) {
    if (/^forjr(?:\/|$)/.test(taken.from)) meant.set(taken.local, { word: taken.name })
    if (!taken.from.startsWith('.')) continue
    const lies = namedFile(file.file, taken.from)
    const other = lies === undefined ? undefined : source[byFile.get(lies) ?? '']
    const declared = other?.tree ? scanned(other.tree).declared.find((one) => one.exportName === taken.name) : undefined
    if (declared) meant.set(taken.local, { definition: declared.name ?? declared.exportName })
  }
  return meant
}

/** The member expression or call a chain is made of, walked down to where it starts. */
function chainStart(node: Node | undefined): Node[] {
  const found: Node[] = []
  for (
    let at = node;
    at;
    at = at.type === 'CallExpression' ? kid(at, 'callee') : isMember(at) ? kid(at, 'object') : undefined
  )
    found.push(at)
  return found
}

/** The keys of an object written in place, as names or texts. */
const keysOf = (node: Node | undefined): string[] =>
  node?.type === 'ObjectExpression'
    ? kids(node, 'properties').flatMap((one) => {
        const key = kid(one, 'key')
        if (one.computed === true || !key) return []
        const name =
          key.type === 'Identifier' ? word(key, 'name') : typeof key.value === 'string' ? key.value : undefined
        return name === undefined ? [] : [name]
      })
    : []

/**
 * Takes a description and the source the build read. Answers, for each code definition whose code is a module of the
 * project - each function and flow written as code but a `python`, each route, command and backfill - what its code
 * shows: the tables it reads and writes through `db`, the columns it sets with values written in place, the
 * functions it calls, the members of agents and flows it calls, the flows it starts and the events it emits by a name
 * written as text. Each list is in the order of its names. What a helper does for it, a name worked out at run time
 * and a table reached by a name the code made stay unseen. A screen and a component are not walked.
 */
export function seenInCode(description: Description, source: Source): SeenInCode {
  const walked = new Map<string, string[]>()
  for (const [name, fn] of Object.entries(description.functions))
    if (fn.form === 'code' && fn.python === undefined) walked.set(name, ['query', 'change', 'action'])
  for (const [name, flow] of Object.entries(description.flows))
    if (flow.form === 'code') walked.set(name, ['flow', 'agent'])
  for (const name of Object.keys(description.routes)) walked.set(name, ['route'])
  for (const name of Object.keys(description.commands)) walked.set(name, ['command'])
  for (const name of Object.keys(description.backfills ?? {})) walked.set(name, ['backfill'])
  const byFile = new Map(Object.entries(source).map(([path, file]) => [file.file, path] as const))
  const seen: SeenInCode = {}
  for (const path of Object.keys(source).sort()) {
    const tree = source[path].tree
    if (!tree) continue
    const meant = meaningsOf(source, path, byFile)
    for (const declared of scanned(tree).declared) {
      const name = declared.name ?? declared.exportName
      if (!walked.get(name)?.includes(declared.word) || Object.hasOwn(seen, name)) continue
      seen[name] = walkedCode(description, declared.statement, meant)
    }
  }
  return seen
}

/** What one statement of a definition is seen to reach, as `seenInCode` answers it for that definition. */
function walkedCode(description: Description, statement: Node, meant: Map<string, Meant>): SeenInCode[string] {
  const [reads, writes, sets, calls, starts, emits] = [0, 1, 2, 3, 4, 5].map(() => new Set<string>())
  const passed = new Set<Node>()
  const definitionOf = (node: Node | undefined): string | undefined => {
    const one = meant.get(nameOf(node) ?? '')
    return one && 'definition' in one ? one.definition : undefined
  }
  const wordOf = (node: Node | undefined): string | undefined => {
    const one = meant.get(nameOf(node) ?? '')
    return one && 'word' in one ? one.word : undefined
  }
  walk(statement, (node) => {
    const table = tableOfMember(node)
    if (table !== undefined && Object.hasOwn(description.tables, table)) reads.add(table)
    // A name that is no reading of its own: the member a member expression reads, a name declared, a key of an object.
    if (isMember(node)) passed.add(kid(node, 'property') ?? node)
    if (node.type === 'VariableDeclarator') passed.add(kid(node, 'id') ?? node)
    if (node.type === 'Property' && node.computed !== true && node.shorthand !== true)
      passed.add(kid(node, 'key') ?? node)
    if (node.type !== 'CallExpression') return
    const callee = kid(node, 'callee')
    const [first, second] = kids(node, 'arguments')
    if (wordOf(callee) === 'start') {
      const flow = definitionOf(first)
      if (flow !== undefined && Object.hasOwn(description.flows, flow) && first) {
        starts.add(flow)
        passed.add(first)
      }
    }
    if (wordOf(callee) === 'emit' && first?.type === 'Literal' && typeof first.value === 'string')
      emits.add(first.value)
    const member = memberName(callee)
    if (member === undefined || !Object.hasOwn(writing, member)) return
    const written = chainStart(kid(callee, 'object'))
      .map(tableOfMember)
      .find((one) => one !== undefined)
    if (written === undefined || !Object.hasOwn(description.tables, written)) return
    writes.add(written)
    const values = writing[member] < 0 ? undefined : [first, second][writing[member]]
    for (const column of keysOf(values)) sets.add(`${written}.${column}`)
  })
  walk(statement, (node) => {
    if (passed.has(node)) return
    // A member of an agent or a flow is called by its owner's name and its own.
    if (isMember(node)) {
      const flow = definitionOf(kid(node, 'object'))
      const member = memberName(node)
      if (flow !== undefined && member !== undefined && Object.hasOwn(description.flows, flow))
        calls.add(`${flow}.${member}`)
    }
    const fn = definitionOf(node)
    if (fn !== undefined && Object.hasOwn(description.functions, fn)) calls.add(fn)
  })
  const sorted = (set: Set<string>): string[] => [...set].sort()
  return {
    reads: sorted(reads),
    writes: sorted(writes),
    sets: sorted(sets),
    calls: sorted(calls),
    starts: sorted(starts),
    emits: sorted(emits),
  }
}
