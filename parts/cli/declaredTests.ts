import { declared } from '../test/index.ts'

// The program that `forjr test --declared` starts in the folder of the project, as the runner starts a test file:
// the cases made from the declarations, each a test of its own; `FORJR_DECLARED=update` keeps the table of access anew.
await declared({ update: process.env.FORJR_DECLARED === 'update' })
