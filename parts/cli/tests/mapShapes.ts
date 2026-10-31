import type { Type } from '../../core/index.ts'
import { boolean, choice, json, list, number, object, text } from '../../core/index.ts'

const edge = object({ kind: text(), name: text(), by: choice(['known', 'seen']) })

/** The stored shape of one line of the map as data. */
const line: Type = object({
  name: text(),
  kind: text(),
  file: text({ optional: true }),
  line: number({ optional: true }),
  rule: text({ optional: true }),
  narrowing: list(text(), { optional: true }),
  doors: list(text()),
  columns: list(text(), { optional: true }),
  browser: object({ bytes: number({ optional: true }), files: json({ optional: true }) }, { optional: true }),
  on: list(text(), { optional: true }),
  files: list(text(), { optional: true }),
  reaches: list(text(), { optional: true }),
  out: list(edge),
  in: list(edge),
  used: object(
    { reads: list(text()), writes: list(text()), whole: list(text()), removes: list(text()), known: boolean() },
    { optional: true },
  ),
  sets: list(text(), { optional: true }),
  code: boolean(),
  tests: list(text(), { optional: true }),
  weight: number(),
})

/** The stored shapes of what `forjr map --json` answers: the app, one definition, one column, one file, a helper. */
export const mapShapes: Record<'app' | 'one' | 'column' | 'file' | 'helper', Type> = {
  app: object({
    app: text(),
    styles: json({ optional: true }),
    hold: object({ net: list(text()), programs: list(text()), native: list(text()) }, { optional: true }),
    page: choice(['built', 'unbuilt', 'none']),
    tests: boolean(),
    box: boolean(),
    lines: list(line),
    more: number(),
  }),
  one: object({ line, last: number(), text: text(), near: list(line), tests: boolean() }),
  column: object({ column: text(), words: text(), reads: list(line), writes: list(line), mayReach: list(line) }),
  file: object({ file: text(), lines: list(line) }),
  helper: object({ file: text(), imports: list(text()), importedBy: list(text()) }),
}
