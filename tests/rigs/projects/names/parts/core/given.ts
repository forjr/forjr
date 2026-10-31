// A file that gives again what another file gives: no name of its own.
export { first } from './one.ts'

/** A name that a file keeps to itself stands in another file for another thing. */
const same = 3

/** A name that this file alone gives. */
export const third = same
