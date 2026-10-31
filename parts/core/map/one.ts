import { ForjrError } from '../errors.ts'
import { isStored } from '../record.ts'
import { nearestWord } from '../stored/shared.ts'
import type { MapInput, MapLine } from './lines.ts'
import { columnWords, mapLines } from './lines.ts'

/** One definition whole: its line with every group whole, its last line and text, the lines it leads to, and whether tests ran. */
export interface MapOne {
  line: MapLine
  last: number
  // 'not shown' where it is held back.
  text: string
  near: MapLine[]
  tests: boolean
}

/** One column: its words, the definitions that read it and write it, and those whose code may reach it. */
export interface MapColumn {
  column: string
  words: string
  reads: MapLine[]
  writes: MapLine[]
  mayReach: MapLine[]
}

/** One file of definitions: its path, and the line of each definition it holds, in the order of their lines. */
export interface MapFile {
  file: string
  lines: MapLine[]
}

/** One file of the project that holds no definition: what it imports and what imports it. */
export interface MapHelper {
  file: string
  imports: string[]
  importedBy: string[]
}

/**
 * Takes what the map is made from and a word. Answers that one thing of the map: a node of an event or a package
 * by `event:<name>` and `package:<name>`; a file of the project, of definitions or a helper; a column as
 * `<table>.<column>`; else a definition by its name. Throws F0001 for a word that is none, with the nearest of the
 * names, columns and files.
 */
export function mapWord(o: MapInput, word: string): MapOne | MapColumn | MapFile | MapHelper {
  const { description } = o
  const { lines, byNode } = mapLines(o)
  const places = Object.values(description.places ?? {}).flatMap((place) =>
    isStored(place) && typeof place.file === 'string' ? [place.file] : [],
  )
  const files = new Set([...places, ...Object.keys(o.imports ?? {})])
  const columns = Object.entries(description.tables).flatMap(([table, record]) =>
    Object.keys(isStored(record.columns) ? record.columns : {}).map((column) => `${table}.${column}`),
  )

  {
    const line = byNode.get(word)
    if (line) {
      const at = o.at?.[word]
      const near: MapLine[] = []
      for (const edge of [...line.out, ...line.in]) {
        const found = lines.find((one) => one.name === edge.name)
        if (found && !near.includes(found)) near.push(found)
      }
      return {
        line,
        last: at?.last ?? 0,
        text: at === undefined ? '' : (at.text ?? 'not shown'),
        near,
        tests: o.tests !== undefined,
      }
    }
  }
  if (files.has(word)) {
    const held = lines.filter((one) => one.file === word).sort((a, b) => (a.line ?? 0) - (b.line ?? 0))
    if (held.length) return { file: word, lines: held }
    const imported = o.imports ?? {}
    return {
      file: word,
      imports: imported[word] ?? [],
      importedBy: Object.keys(imported)
        .filter((one) => imported[one].includes(word))
        .sort(),
    }
  }
  if (columns.includes(word)) {
    const [table, column] = [word.slice(0, word.indexOf('.')), word.slice(word.indexOf('.') + 1)]
    const reads: MapLine[] = []
    const writes: MapLine[] = []
    const mayReach: MapLine[] = []
    for (const line of lines) {
      const used = line.used
      const known = used !== undefined
      if (known && (used.reads.includes(word) || used.whole.includes(table))) reads.push(line)
      if ((known && used.writes.includes(word)) || line.sets?.includes(word)) writes.push(line)
      const reaches = line.out.some((one) => (one.kind === 'reads' || one.kind === 'writes') && one.name === table)
      if (!known && reaches && line.kind !== 'table') mayReach.push(line)
    }
    const type: unknown = Reflect.get(Object(description.tables[table].columns), column)
    return { column: word, words: columnWords(column, type), reads, writes, mayReach }
  }
  const near = nearestWord(word, [...byNode.keys(), ...columns, ...files])
  throw new ForjrError('F0001', `The app has no definition, column or file named \`${word.slice(0, 120)}\`.`, {
    fields: { word: word.slice(0, 120) },
    fix: `Name one that \`forjr map\` lists: the nearest is \`${near}\`.`,
  })
}
