import { isStored } from './record.ts'

// The test of a filter by the word that stores it, in the words that say it.
const testWords: [string, string][] = [
  ['is', 'is'],
  ['above', 'above'],
  ['atLeast', 'at least'],
  ['below', 'below'],
  ['atMost', 'at most'],
  ['not', 'is not'],
  ['in', 'in'],
  ['contains', 'contains'],
  ['startsWith', 'starts with'],
  ['before', 'before'],
  ['after', 'after'],
]

/** A stored value of a filter in words: a text in quotes, a number and a boolean as written, a reference by its name. */
function valueWords(value: unknown): string {
  if (typeof value === 'string') return `'${value}'`
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(valueWords).join(', ')}]`
  if (isStored(value)) {
    for (const from of ['input', 'caller', 'setting'])
      if (typeof value[from] === 'string') return `${from}.${value[from]}`
    if (value.now === true) return 'now'
    if (typeof value.col === 'string') return value.col
  }
  return 'a value worked out'
}

/** A stored filter in words: each test of a column, `any` joined by `or` in brackets, `all` by `and`, `not` around. */
function filterWords(filter: unknown): string {
  if (!isStored(filter)) return 'a value worked out'
  if (Array.isArray(filter.any)) return `(${filter.any.map(filterWords).join(' or ')})`
  if (Array.isArray(filter.all)) return filter.all.map(filterWords).join(' and ')
  if (filter.not !== undefined && typeof filter.col !== 'string') return `not (${filterWords(filter.not)})`
  const column = String(filter.col)
  const given = filter.given === true ? ' if given' : ''
  if (filter.empty !== undefined) return `${column} is ${filter.empty === false ? 'not ' : ''}empty${given}`
  if (typeof filter.filled === 'string') return `${column} is ${filter.filled}${given}`
  const [stored, words] = testWords.find(([word]) => filter[word] !== undefined) ?? ['is', 'is']
  return `${column} ${words} ${valueWords(filter[stored])}${given}`
}

/**
 * Takes a stored rule. Answers who it lets in, in plain words: the one wording of a rule that the map, the impact
 * and what reads for the engine's own model say. A value that is no rule lets nobody in.
 */
export function ruleWords(rule: unknown): string {
  if (!isStored(rule)) return 'nobody'
  if (rule.rule === 'anyone')
    return typeof rule.why === 'string' && rule.why !== '' ? `anyone (why: ${rule.why})` : 'anyone'
  if (rule.rule === 'signedIn') return 'anyone signed in'
  if (rule.rule === 'owner') return 'the owner of the row'
  if (rule.rule === 'role') return `role ${String(rule.role)}`
  if ((rule.rule === 'where' || rule.rule === 'allow') && typeof rule.module === 'string')
    return 'a rule written as code'
  if (rule.rule === 'where' && rule.filter !== undefined) return `where ${filterWords(rule.filter)}`
  if (rule.rule === 'where' && rule.give !== undefined) return 'where a filter worked out'
  if (rule.rule === 'allow' && rule.test !== undefined) return 'if a test worked out'
  return 'nobody'
}
