import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { fileURLToPath } from 'node:url'

// A test file and a program of an app are run as they are written, with no build. So what the build answers for
// them is answered here: every import of the framework, each by the entry file this program itself uses, and a
// file of the project that is named with no ending, as the files of a project name each other.
const entries: Record<string, string> = {
  forjr: new URL('../core/index.ts', import.meta.url).href,
  'forjr/ai': new URL('../ai/index.ts', import.meta.url).href,
  'forjr/build': new URL('../build/index.ts', import.meta.url).href,
  'forjr/check': new URL('../check/index.ts', import.meta.url).href,
  'forjr/cli': new URL('../connect/cliEntry.ts', import.meta.url).href,
  'forjr/connect': new URL('../connect/index.ts', import.meta.url).href,
  'forjr/core': new URL('../core/internal.ts', import.meta.url).href,
  'forjr/data': new URL('../data/index.ts', import.meta.url).href,
  'forjr/docs': new URL('../docs/index.ts', import.meta.url).href,
  'forjr/engine': new URL('../engine/index.ts', import.meta.url).href,
  'forjr/engine/inside': new URL('../engine/rooms/inside/inside.ts', import.meta.url).href,
  'forjr/flows': new URL('../flows/index.ts', import.meta.url).href,
  'forjr/history': new URL('../history/index.ts', import.meta.url).href,
  'forjr/publish': new URL('../publish/index.ts', import.meta.url).href,
  'forjr/test': new URL('../test/index.ts', import.meta.url).href,
  'forjr/ui': new URL('../screens/index.ts', import.meta.url).href,
  'forjr/ui/draw': new URL('../screens/draw.ts', import.meta.url).href,
  'forjr/workspaces': new URL('../workspaces/index.ts', import.meta.url).href,
}

registerHooks({
  resolve(name, context, next) {
    if (Object.hasOwn(entries, name)) return { url: entries[name], shortCircuit: true }
    if (name.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[a-z]+$/.test(name))
      for (const ending of ['.ts', '.tsx', '/index.ts']) {
        const url = new URL(name + ending, context.parentURL)
        if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true }
      }
    return next(name, context)
  },
})
