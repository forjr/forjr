import { passedOn } from '../passed.ts'
import type { Rule } from '../rule.ts'

/** Index advice that a running app gave, or that its log holds: passed on from its facts, under `F2029`. */
export const rule: Rule = passedOn('F2029')
