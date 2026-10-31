import type { Description } from '../../core/internal.ts'
import { isStored } from '../../core/internal.ts'

/** A stored record of a description. */
export type Stored = Record<string, unknown>

/** The records of one part of a description by their names, as a part that is none holds no record. */
export function recordsOf(description: Description, part: string): Record<string, Stored> {
  const held: unknown = Reflect.get(description, part)
  const records: Record<string, Stored> = {}
  for (const [name, record] of Object.entries(isStored(held) ? held : {})) if (isStored(record)) records[name] = record
  return records
}

// How narrow a rule is, from the widest.
const narrowness: Record<string, number> = { anyone: 0, signedIn: 1, owner: 2, role: 2, where: 2, allow: 2, nobody: 3 }

/** How narrow a stored rule is: one that is no rule lets nobody in. */
export const rankOf = (rule: unknown): number => (isStored(rule) ? (narrowness[String(rule.rule)] ?? 3) : 3)

/** The name of a door in words. */
export const doorOf = (door: string): string =>
  door === 'api' ? 'the API' : door === 'mcp' ? 'MCP' : door === 'cli' ? 'the command line' : door

/** Whether a type lets a value be left out: it is optional, or has a default. */
export const leftOut = (type: unknown): boolean =>
  isStored(type) && (type.optional === true || type.default !== undefined)

/** A stored list as its texts: a value that is no list holds none. */
export const listOf = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])

/** The doors a definition is offered to. */
export const doorsOf = (record: Stored | undefined): string[] =>
  Array.isArray(record?.offer) ? record.offer.map(String) : []

// The parts that a description may leave out where they hold nothing, which what reads one asks for by name.
const parts = [
  'tables',
  'functions',
  'flows',
  'screens',
  'components',
  'services',
  'models',
  'routes',
  'incoming',
  'commands',
]

/** A description with every part that it left out as an empty one. */
export const wholeOf = (description: Description): Description =>
  Object({ ...Object.fromEntries(parts.map((part) => [part, {}])), ...description })
