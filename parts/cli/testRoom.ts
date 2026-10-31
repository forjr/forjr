/**
 * Takes the room that `forjr test --room` names, where it names one. States it for the run of the tests, which
 * `testApp` reads as `FORJR_ROOM`: `apart`, the test room, which crosses every call, or `program`, the room of the
 * program. Answers what states again what stood before, once the run has ended.
 */
export function roomOfRun(room: unknown): () => void {
  if (room !== 'apart' && room !== 'program') return () => undefined
  const before = process.env.FORJR_ROOM
  if (room === 'apart') process.env.FORJR_ROOM = 'apart'
  else delete process.env.FORJR_ROOM
  return () => {
    if (before === undefined) delete process.env.FORJR_ROOM
    else process.env.FORJR_ROOM = before
  }
}
