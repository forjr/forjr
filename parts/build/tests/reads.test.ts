import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { Description } from '../../core/internal.ts'
import { write } from '../../core/internal.ts'
import { describeProject } from '../index.ts'
import { layDefinition } from './laying.ts'
import { copyOf, errorsOf, filesOf } from './projects.ts'

/** A description as its text, without what names the text of its sources. */
const held = (description: Description): string =>
  write({ ...description, places: {}, sources: {} }).text.replace(/\.[0-9a-f]{12}\.js/g, '.<fp>.js')

/** The files of a project by their paths, as text, without what a build keeps for itself. */
const textsOf = (folder: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(filesOf(folder))
      .filter(([path]) => !path.startsWith('.forjr/') && path !== 'forjr.d.ts')
      .map(([path, hex]) => [path, Buffer.from(hex, 'hex').toString('utf8')]),
  )

/** A later change of every value that a definition of the project reads: the helper file, and the files' own names. */
const later: [string, string, string][] = [
  ['shared/values.ts', 'MAX = 80', 'MAX = 61'],
  ['shared/values.ts', 'LIMIT = 20', 'LIMIT = 21'],
  ['shared/values.ts', "TITLE = 'Orders'", "TITLE = 'Bills'"],
  ['shared/values.ts', "['open', 'paid']", "['held', 'paid']"],
  ['shared/values.ts', 'max: 200', 'max: 150'],
  ['tables/reads.ts', 'NAME_LENGTH = 40', 'NAME_LENGTH = 41'],
  ['tables/reads.ts', '{ WIDE: 120 }', '{ WIDE: 121 }'],
  ['tables/reads.ts', '[NARROW] = [12]', '[NARROW] = [13]'],
  ['tables/reads.ts', 'max: 8', 'max: 9'],
  ['tables/reads.ts', "common = { access: { read: 'signedIn' } }", "common = { access: { read: 'anyone' } }"],
]

/** Makes the later change in a folder. */
function changeLater(folder: string): void {
  for (const [path, from, to] of later) {
    const file = join(folder, path)
    const text = readFileSync(file, 'utf8')
    if (text.includes(from)) writeFileSync(file, text.replace(from, to))
  }
}

/** One edit of a definition, as a tool is asked for it: of a table or of a query. */
function edit(description: Description, name: string): void {
  if (Object.hasOwn(description.tables, name))
    Object.assign(Object(description.tables[name].columns), { added: { kind: 'number' } })
  else {
    const plan = Object(description.functions[name].plan)
    plan.limit = Number(plan.limit) + 1
  }
}

const isRead = /reads|helper|own|whole|taken|spread/i

test('[34-2] edits of definitions that read a value: of a helper file, of a helper file imported whole, of an imported function, of a const that is taken apart, of the file, through a spread, and of none, in tables and queries: a read stays a read, or the tool refuses with every file as it was', async (t) => {
  const project = copyOf('reads', 'reads')
  const built = await describeProject(project)
  assert.deepEqual(errorsOf(built.findings), [])
  const base = textsOf(project)
  // What the later change makes of the project where no tool wrote anything.
  changeLater(project)
  const reached = (await describeProject(project)).description
  for (const [path, text] of Object.entries(base)) writeFileSync(join(project, path), text)

  // A screen and a component have no text of this kind: their view is code, which a tool writes as the text of its file.
  const views = [...Object.keys(built.description.screens), ...Object.keys(built.description.components)]
  const names = Object.keys(built.description.places).filter((name) => name !== 'shop' && !views.includes(name))
  const right: string[] = []
  const refused: Record<string, string[]> = {}
  const wrong: string[] = []
  for (const name of names) {
    const meant: Description = structuredClone(built.description)
    edit(meant, name)
    const laid = await layDefinition(project, built, meant, name)
    if (!laid.wrote) {
      assert.deepEqual(textsOf(project), base, `${name}, refused: every file is byte for byte as it was`)
      const why = laid.why.replace(/ on line \d+/, '').replace(/`[^`]+`/g, '<name>')
      refused[why] = [...(refused[why] ?? []), name]
      continue
    }
    const made = await describeProject(project)
    const ok = !errorsOf(made.findings).length && held(made.description) === held(meant)
    // The read stays a read: the later change reaches the definition as it reaches it where nothing was written.
    changeLater(project)
    const after = (await describeProject(project)).description
    const expected: Description = structuredClone(reached)
    edit(expected, name)
    const part = Object.hasOwn(after.tables, name) ? 'tables' : 'functions'
    const reaches = JSON.stringify(after[part][name]) === JSON.stringify(expected[part][name])
    if (ok && reaches) right.push(name)
    else
      wrong.push(
        `${name}: ${ok ? 'the read became a value' : errorsOf(made.findings).join(' ') || 'another description'}`,
      )
    for (const [path, text] of Object.entries(base)) writeFileSync(join(project, path), text)
  }
  t.diagnostic(`right: ${right.length} ${JSON.stringify(right)}`)
  t.diagnostic(`refused: ${Object.values(refused).flat().length} ${JSON.stringify(refused)}`)
  assert.deepEqual(wrong, [], 'no result is wrong')
  // Each definition that reads no value is written, and each that reads one is refused or keeps the read.
  for (const name of ['plainTable', 'bareTable', 'plainQuery']) assert.ok(right.includes(name), name)
  for (const name of names) if (!right.includes(name)) assert.match(name, isRead, `${name} is refused`)
})

test('[34-2] a word that a backend file lacks is imported from forjr after the last import line, behind its comment, and the file builds to what was meant', async () => {
  const project = copyOf('reads', 'reads-word')
  const built = await describeProject(project)
  const meant: Description = structuredClone(built.description)
  edit(meant, 'bareTable')
  const laid = await layDefinition(project, built, meant, 'bareTable')
  assert.equal(laid.wrote, true)
  const text = readFileSync(join(project, 'tables', 'bare.ts'), 'utf8')
  assert.ok(
    text.startsWith("import { table, text } from 'forjr' // the words of ours\nimport { number } from 'forjr'\n"),
    text,
  )
  const made = await describeProject(project)
  assert.deepEqual(errorsOf(made.findings), [])
  assert.equal(held(made.description), held(meant))
})

/** The files of a project by their paths, without what a build keeps for itself. */
const written = (folder: string): Record<string, string> =>
  Object.fromEntries(Object.entries(filesOf(folder)).filter(([path]) => !path.startsWith('.forjr/')))

/**
 * Holds a value that the file names by what it is for: after a definition was written anew, a later change of the
 * helper file must still reach it. Lays one definition as it is meant, and answers what the tool said, and whether
 * the later change reaches the definition as it did before the tool wrote.
 */
async function laidThenChanged(
  name: string,
  edit: (meant: Description) => void,
  helper: (text: string) => string,
): Promise<{ wrote: boolean; why: string; same: boolean; reaches: boolean }> {
  const folder = copyOf('readWords', `read-words-${name}`)
  const built = await describeProject(folder)
  assert.deepEqual(errorsOf(built.findings), [])
  const base = written(folder)
  const constants = join(folder, 'shared', 'constants.ts')

  // What a later change of the helper file gives where no tool wrote anything.
  writeFileSync(constants, helper(readFileSync(constants, 'utf8')))
  const reached = (await describeProject(folder)).description
  writeFileSync(constants, Buffer.from(base['shared/constants.ts'], 'hex'))
  assert.notEqual(held(reached), held(built.description), 'the change of the helper file reaches the definition')

  const meant: Description = structuredClone(built.description)
  edit(meant)
  const laid = await layDefinition(folder, built, meant, name)
  if (!laid.wrote)
    return {
      wrote: false,
      why: laid.why,
      same: JSON.stringify(written(folder)) === JSON.stringify(base),
      reaches: true,
    }
  writeFileSync(constants, helper(readFileSync(constants, 'utf8')))
  const after = (await describeProject(folder)).description
  const part = Object.hasOwn(reached.tables, name) ? 'tables' : 'screens'
  // The edit apart, the definition is what the later change of the helper file makes of it.
  const value = (d: Description): string => JSON.stringify(d[part][name]).replaceAll('"added":{"kind":"text"},', '')
  return { wrote: true, why: '', same: false, reaches: value(after) === value(reached) }
}

const addColumn = (name: string) => (meant: Description) => {
  Object.assign(Object(meant.tables[name].columns), { added: { kind: 'text' } })
}

for (const [name, what, helper] of [
  [
    'importedConstant',
    'a constant that its file imports from a helper file',
    (text: string) => text.replace('MAX = 80', 'MAX = 60'),
  ],
  [
    'starImported',
    'a constant of a helper file that its file imports whole',
    (text: string) => text.replace('MAX = 80', 'MAX = 60'),
  ],
  [
    'importedCall',
    'a call of a function that its file imports',
    (text: string) => text.replace('max: 200', 'max: 100'),
  ],
] as const)
  test(`[34-2] an edit of a table whose option reads ${what} is refused with every file as it was, or the read stays a read: a later change of the helper file still reaches the definition`, async () => {
    const laid = await laidThenChanged(name, addColumn(name), helper)
    if (!laid.wrote) assert.ok(laid.same, `${name}, refused: every file is byte for byte as it was`)
    assert.ok(laid.reaches, `${name} was written anew with the value in the place of the name it read`)
  })

test('[34-2] an edit of a screen whose option reads a constant that its file imports is refused, or the read stays a read', async () => {
  const laid = await laidThenChanged(
    'importedInOption',
    (meant) => {
      Object.assign(Object(Object(meant.screens.importedInOption.tree).props), { gap: 12 })
    },
    (text) => text.replace("['open', 'paid']", "['held', 'paid']"),
  )
  if (!laid.wrote) assert.ok(laid.same)
  assert.ok(laid.reaches, 'the title was written as the value that the constant held')
})

test('[34-2] an edit of a table whose option reads a top-level const that is taken apart is refused, and names the name', async () => {
  const folder = copyOf('readWords', 'read-words-apart')
  const built = await describeProject(folder)
  assert.deepEqual(errorsOf(built.findings), [])
  const base = written(folder)
  const meant: Description = structuredClone(built.description)
  addColumn('takenApart')(meant)
  // `34`, section 7, point 10 (a): "a top-level `const` in an option ... the tool refuses the change, names the name
  // and its line, and changes no file".
  const laid = await layDefinition(folder, built, meant, 'takenApart')
  assert.equal(laid.wrote, false, readFileSync(join(folder, 'tables', 'hands.ts'), 'utf8'))
  assert.match(laid.wrote ? '' : laid.why, /WIDE/)
  assert.deepEqual(written(folder), base)
})

test('[34-2] an edit that needs a word of ours which a backend file does not import adds its import line from forjr, and the project builds to the description that was meant', async () => {
  const folder = copyOf('readWords', 'read-words-word')
  const built = await describeProject(folder)
  assert.deepEqual(errorsOf(built.findings), [])
  const base = written(folder)
  const meant: Description = structuredClone(built.description)
  Object.assign(Object(meant.tables.plainTable.columns), { count: { kind: 'number' } })
  const laid = await layDefinition(folder, built, meant, 'plainTable')
  if (!laid.wrote) {
    assert.deepEqual(written(folder), base, 'refused: every file is byte for byte as it was')
    return
  }
  const made = await describeProject(folder)
  assert.deepEqual(errorsOf(made.findings), [], readFileSync(join(folder, 'tables', 'plain.ts'), 'utf8'))
  assert.equal(held(made.description), held(meant))
})
