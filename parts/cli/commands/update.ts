import { boolean, later, ForjrError, text } from '../../core/index.ts'
import { guardedFetch, typedHosts } from '../../connect/index.ts'
import { updateInstall } from '../install/updateInstall.ts'
import { releasesOf, runnerFolder, shippedRelease, trustedKeys } from '../../engine/index.ts'
import type { Command } from '../command.ts'

/**
 * Updates the install to the newest release, or to the version that is typed, and with `--back` swaps it with
 * the one before. `--build-tools` brings the build tools too, `--keep` removes no older version, and `--time`
 * bounds how long one layer may take. Under the npm door updating is npm's own: the command says which npm
 * command to type, and ends with 2.
 */
export const command: Command = {
  name: 'update',
  args: {
    version: text({ optional: true }),
    back: boolean({ optional: true }),
    'build-tools': boolean({ optional: true }),
    keep: boolean({ optional: true }),
    time: text({ optional: true }),
  },
  needs: 'nothing',
  run: async ({ args }) => {
    const shipped = shippedRelease()
    if (!shipped)
      throw new ForjrError('F0013', 'This framework runs from its own sources, and is no install to update.', {
        fix: 'Install Forjr, and update that.',
      })
    if (shipped.player.split(/[\\/]/).includes('node_modules'))
      throw new ForjrError('F0013', 'Forjr was installed with npm, which updates it itself.', {
        fix: 'Type npm install -g forjr@latest, or in a project npm install forjr@latest.',
      })
    const at = releasesOf()
    if (!at)
      throw new ForjrError('F0013', 'No address of releases ships with this install.', {
        fix: 'Name the place releases are served from with FORJR_RELEASES=<address>.',
      })
    const home = runnerFolder()
    const done = await updateInstall(home, {
      ...(typeof args.version === 'string' ? { version: args.version } : {}),
      ...(args.back === true ? { back: true } : {}),
      ...(args['build-tools'] === true ? { tools: true } : {}),
      ...(args.keep === true ? { keep: true } : {}),
      ...(typeof args.time === 'string' ? { time: later(new Date(0), args.time).getTime() } : {}),
      from: at.from,
      keys: trustedKeys(home),
      fetch: guardedFetch({ mode: 'live', ...(at.typed ? { privateHosts: typedHosts(at.from) } : {}) }),
    })
    return { value: done }
  },
}
