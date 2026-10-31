# Contributing to Forjr

Thank you for helping. Bugs, ideas and questions go to the [issues](https://github.com/forjr/forjr/issues). For a change of more than a few lines, open an issue first, so we agree on it before you write it. A security problem goes to the address in [SECURITY.md](SECURITY.md), never to a public issue.

## Setting up

You need Node.js 26.11.0, the version that `.node-version` names, and git.

```sh
git clone https://github.com/forjr/forjr
cd forjr
npm ci
```

`forjr` runs from the copy as it stands: `npm run forjr -- <command>` inside it, or `node <the copy>/parts/cli/shell.ts <command>` from a project of your own. A program of your own that imports the framework from the copy is started with the hook that finds its imports there: `node --import <the copy>/parts/cli/names.ts server.ts`. `--import` takes an address of a module: a relative path, or on Windows a whole one written as `file:///C:/...`.

## The layout

| Folder | Holds |
|---|---|
| `parts/` | The framework, one folder for each part. A part's entry files, which `parts/entries.json` lists, are all that another part may import, and `parts/parts.json` says which parts each may use. |
| `parts/<part>/tests/` | The small tests of that part, and every helper and project its tests use |
| `tests/apps/<part>/`, `tests/browsers/<part>/` | The large tests of that part: those that open a test app, run the `forjr` command or start another program, and those that drive a browser |
| `parts/docs/pages/` | The docs that ship in the package, one Markdown file for each page |
| `examples/` | Whole apps built with Forjr, each with a README |
| `install/` | The release: the layers of each system, the installers and the npm packages |
| `rig/`, `scripts/`, `tests/rigs/` | What the tests stand on, the checks of the repository, and their own tests, with the projects those plant in `tests/rigs/projects/` |
| `tests/examples/` | The walk of each example, as a person goes through it |

## Checking a change

```sh
npm run all
```

runs every check, on Windows and on Linux before a change is pushed: the made lists (`npm run lists`), the formatter and the linter (`npm run lint`), the type check (`npm run types`), the search for what nothing uses, and the tests (`npm test`). One test file alone, with the two hooks that `npm test` gives every test, for a screen file and for a test that reaches no network: `node --import ./rig/jsx.ts --import ./rig/offline.ts --test parts/<part>/tests/<file>.test.ts`. A test whose name holds `[night]` is a heavy one, run by `npm run night`. `npm run format` lays the code out as the formatter does.

`npm test` runs again only what a change touched. Each test file runs in a program of its own, and `rig/touched.ts` notes every source file that program loads and every file and folder it reads, copies, opens or lists in the repository, a copied folder by every file in it, also in the programs a test starts and in every thread of them, each as it stood when it was first read, and each word of the environment they read as the run handed it, by the fingerprint of its value; `results/kept/` keeps that record with how the file ended. A file changed while its test ran keeps no record. A file is run again where a file it touched or a word it read changed, where it failed, where it holds a night test or a measure, where its rigs wrote a measure or a picture, or where the runtime, the system, `package-lock.json`, `biome.json`, `tsconfig.json`, `budgets.json` or the files of the run itself changed; every other file is replayed, and its tests stand as they ended when it was kept. `npm test -- --all` runs every file, and `npm test -- --profile` writes what each test file cost in time and memory into `results/profile.json`, with the costliest printed. A run starts as many test files at once as the processor has cores less one and the memory there is holds, hands every program the runtime's compile cache under `results/compile-cache/`, and gives each program one browser of each engine, with a context of its own for each use. The files of the tests that failed are run once more: a test that passes there passes the run and is named flaky, in the run's output and its result file, until it is mended, and a test that fails twice fails the run. `forjr test` tries nothing twice.

Every test runs on Windows and on Linux on the computer of the change. GitHub runs the test files of `tests/systems.txt` on macOS, whose point is a difference between systems: file paths, programs, the installer, file rights. It keeps the record of `results/kept/` between its runs, so a push there too runs only the files its change touched. A test file of `tests/browsers.txt`, whose point is a difference between browsers, goes through Chromium, Firefox and WebKit, and every other through Chromium alone. `npm test -- --list=<file>` runs the test files a file names, one on each line, and `--times=<n>` runs them that many times in a row with no second try: a new test file is run three times so before it is pushed, and one failure fails it.

Our rule for tests, from the faults of the public runs: no wait by time, no zone assumed, no path assumed, no right of the account assumed, and measures alone are held to time. Before you push, run your change on this computer with each machine's own setting: a zone other than yours, a path with a space, an account with no right of its own.

## Finding your way

```sh
npm run map
```

prints the repository for the person or the agent that reads it: each part with the parts it may use, which `parts/parts.json` holds, and its entry files; then each file of the parts, the heaviest first by the walk from the entry files over what imports what, with the first line of the block of its first export, the files it imports, the files that import it and how many test files touched it in their last run, cut to 1,500 tokens. `npm run map <part>` gives one part, `npm run map <file>` one file whole, with each name it exports and every test file that touched it; `--size <tokens>`, `--all` and `--json` as for `forjr map`.

```sh
npm run check
npm run impact
```

`npm run check` runs every check of `npm run all` but the tests and the text of the interfaces, and the rules of review of `scripts/review/`, and answers what they found as one list, `<file>:<line>  <check>  <message>`, with each program the tree does not hold named as not run. `npm run impact` names the files your change touched against the point it left `main`, with the files git does not track yet, the files that import them however deep, their parts, and the test files whose last run touched a changed file: the ones to run first.

The rules of review that a script holds, each in `scripts/review/` with its test: every function a part gives carries a block written as `/** */` right above it (`blocks.mjs`); what a change adds holds no secret of a known form and no path that `.gitignore` names (`committed.mjs`); no file holds a dash but the plain hyphen (`dashes.mjs`). A reviewer holds the rest by reading:

- **One job for a file**, and one file for a job: a file is split where it holds two, never for its length.
- **A comment says why**, where a reader could not know it from the code, and never what the code does or how it came to be.
- **Nothing written twice**, in the same words or in others: logic that two parts need lives once, in the lowest part both may use.
- **The same word for the same thing**, in a name, a comment and a page.

## Writing a change

- **Tests first.** A change comes with the tests that prove it, and each of them fails without the change.
- **TypeScript in strict mode**, ES modules, with nothing that silences the type checker: no `any`, and no cast through `unknown`.
- **A file does one job**, and one job lives in one file. No part reaches inside another: it imports the other's entry files alone.
- **Nothing left behind.** When a thing is replaced, the old one goes in the same change. No export that nothing uses, no code that is commented out.
- **A comment says why**, in a line or two: a constraint, a trap, an outside fact with its address. Never what the code does.
- **Every failure is a `ForjrError`** with its code, and every code, command, word, option, tag and hook has its page in `parts/docs/pages/`. A change of what the framework does changes its page in the same pull request.
- **Plain words.** The same word always means the same thing, in the code and in the docs.

## Pull requests

Keep one pull request to one change. Its text says what it changes and why, and its tests pass on Windows and Linux, and the run on GitHub on macOS, before it is merged.

By contributing, you agree that your contribution is given under the [MIT licence](LICENSE) of Forjr.
