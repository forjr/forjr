import type { Description } from './description.ts'

// The parts of a description that hold definitions by their names.
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

/** The kind of a definition as the graph and the policy of a workspace name it: one of the ten words, `agent`, `python`, `route`, `incoming`, `command`. */
function kindOf(part: string, record: Record<string, unknown>): string {
  if (part === 'functions') return record.python !== undefined ? 'python' : String(record.kind ?? 'action')
  if (part === 'flows') return record.agent !== undefined ? 'agent' : 'flow'
  return part.replace(/s$/, '')
}

/** One definition of a description: its kind, its stored record, and the file it lies in. */
export interface Placed {
  kind: string
  record: Record<string, unknown>
  file?: string
}

/**
 * Takes a description. Answers every definition of the ten parts that the policy of a workspace holds by its name,
 * the project among them as `project`, each with its kind and the file the description places it in. A backfill, a
 * package and an event are none of them.
 */
export function definitionsOf(description: Description | undefined): Map<string, Placed> {
  const found = new Map<string, Placed>()
  if (!description) return found
  const places: Record<string, unknown> = Object(Reflect.get(description, 'places'))
  const fileOf = (name: string): string | undefined => {
    const file: unknown = Reflect.get(Object(places[name]), 'file')
    return typeof file === 'string' ? file : undefined
  }
  for (const part of parts) {
    const all: Record<string, unknown> = Object(Reflect.get(description, part))
    for (const [name, record] of Object.entries(all)) {
      const file = fileOf(name)
      found.set(name, { kind: kindOf(part, Object(record)), record: Object(record), ...(file ? { file } : {}) })
    }
  }
  const project: Record<string, unknown> = Object(Reflect.get(description, 'project'))
  const name = String(Reflect.get(Object(Reflect.get(description, 'app')), 'name') ?? '')
  const file = fileOf(name)
  if (name !== '') found.set(name, { kind: 'project', record: project, ...(file ? { file } : {}) })
  return found
}
