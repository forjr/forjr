#!/usr/bin/env node
// `npm create forjr <name>`: the one thing it does is run `forjr new <name>` of the newest forjr.
process.exitCode = (await import('node:child_process')).spawnSync(process.execPath, [process.env.npm_execpath, 'exec', '--yes', '--package', 'forjr@latest', '--', 'forjr', 'new', ...process.argv.slice(2)], { stdio: 'inherit' }).status ?? 1
