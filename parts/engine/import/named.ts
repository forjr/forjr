import { ForjrError } from '../../core/index.ts'
import type { Opened } from '../opened.ts'

/** The name of a change of the app that an import hands its records to. Throws F0001 for a name that is no change. */
export function changeNamed(o: Opened, name: unknown): string {
  const record =
    typeof name === 'string' && Object.hasOwn(o.description.functions, name) ? o.description.functions[name] : undefined
  if (typeof name !== 'string' || record?.kind !== 'change')
    throw new ForjrError(
      'F0001',
      `No change named ${(JSON.stringify(name) ?? 'nothing').slice(0, 80)} can take the records.`,
      { fix: 'Name a change of the app to hand each record to: `forjr map` lists them.' },
    )
  return name
}
