import { boolean, ForjrError, number, text } from '../../core/index.ts'
import { finding, mapText } from '../../core/internal.ts'
import { isMapAnswer } from '../answerShapes.ts'
import type { Command } from '../command.ts'
import { mapAskedOf, mapMade } from '../mapRelease.ts'
import { withText } from '../print.ts'
import { askedOfRunning } from '../reach.ts'

/**
 * Prints the app for the AI that reads it: each definition with its file and line, who may call it, what it reads
 * and writes, who uses it and its tests, the heaviest first, cut to a size in tokens; or one definition, one column
 * or one file whole. A session of `forjr dev` that runs on the data folder answers it from what it built; with none,
 * the project is built for release into a folder that is removed, so the bytes of the page are known. With `--json`
 * it answers the map as data.
 */
export const command: Command = {
  name: 'map',
  args: {
    name: text({ optional: true }),
    size: number({ optional: true, whole: true, min: 1 }),
    all: boolean({ optional: true }),
    data: text({ optional: true }),
  },
  needs: 'project',
  run: async ({ args, folder }) => {
    const asked = mapAskedOf(args)
    const running = await askedOfRunning({ folder, data: args.data }, 'map', asked)
    // An engine that is no session of development has no command `map`, which its refusal says by its code and its
    // fields: the map is made from the files.
    const holdsNone = running?.findings?.some((one) => one.code === 'F0001' && one.fields?.command === 'map')
    if (running && !holdsNone) {
      const refused: unknown = Reflect.get(Object(running.value), 'refused')
      if (typeof refused === 'object' && refused !== null) {
        const fix: unknown = Reflect.get(refused, 'fix')
        const code = String(Reflect.get(refused, 'code'))
        return {
          findings: [finding(code, String(Reflect.get(refused, 'message')), typeof fix === 'string' ? { fix } : {})],
        }
      }
      if (!isMapAnswer(running.value)) return { findings: running.findings ?? [] }
      return { value: withText(running.value, mapText(running.value)), findings: running.findings ?? [] }
    }
    try {
      const made = await mapMade(folder, asked)
      return { value: withText(made.value, mapText(made.value)), findings: made.findings }
    } catch (error) {
      // A word that names nothing is a finding, with the nearest name in its fix.
      if (!(error instanceof ForjrError)) throw error
      return { findings: [finding(error.code, error.message, error.fix === undefined ? {} : { fix: error.fix })] }
    }
  },
}
