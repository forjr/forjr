# The check

The check builds the description of a project, carries out every rule on it, and answers every finding at once. It never stops at the first, and it changes no file but the type list of the project. `checkProject` of `forjr/check` does it, and `forjr check` is a few lines over it.

```ts
import { checkProject } from 'forjr/check'

const { findings, forms, why } = await checkProject('./my-app')
```

| It answers | Holds |
|---|---|
| `findings` | Each with its level, its code, its file and line, its definition, a sentence, the fix, and the command that explains its code |
| `forms` | For each definition, `'plain'` or `'code'`, and no more. `forjr check --json` prints it as `definitions`, with `why` beside it |
| `why` | For each code definition, what made it code: the option, the thing, and its line |

A program that builds each save runs the two halves of the check apart, as `command.dev` does. `rulesOver({ description, source })` carries out our own rules over what a build just read, and reads no file. `keepTypes(folder, source)` starts the type checker and keeps it running: `next()` answers what its next pass reported, and `stop()` ends it.

## The two layers

Our own rules read the description and the source, and finish in well under a second. The type checker then reads the whole project, as a program of its own, with `forjr.d.ts` written anew first. Each of its findings is `code.F8000`.

## The levels

An error blocks a build: no bundle is written. A warning and a note do not.

## The groups

| Codes | Group |
|---|---|
| `F1...` | Shape: found while the project is built and described |
| `F2...` | Data: `code.F2005`, `code.F2006`, `code.F2007`, `code.F2008`, `code.F2009`, `code.F2010`, `code.F2011`, `code.F2012`, for a table that keeps a data file for each tenant `code.F2013` and the note `code.F2014`, and what the data of a running app says of a table change, `code.F2001` to `code.F2004` |
| `F3...` | Safety: `code.F3001`, `code.F3002`, `code.F3003`, `code.F3004`, `code.F3005`, `code.F3006`, `code.F3009` |
| `F4...` | Queries: `code.F4001`, `code.F4002`, `code.F4003`, `code.F4004`, `code.F4005` |
| `F6...` | Screens: `code.F6007`, `code.F6008`, `code.F6009`, `code.F6011`, `code.F6012`, `code.F6013`, `code.F6015`, `code.F6018`, `code.F6021`, `code.F6022`, `code.F6023`, `code.F6032` and the warnings `code.F6025`, `code.F6030` and `code.F6031`. They read a view as its file writes it, and hold what the type checker cannot see: an address, a cache, an entry of `data`, a form's function |
| `F8...` | Types: `code.F8000`, `code.F8001`, `code.F8002` |
| `F9...` | The project: `code.F9002` |

The other groups arrive with the parts they hold: flows, and connecting out.

The type checker reads the screen files too. Where it says that a name does not exist on a row, the finding ends with the table and its columns, as: The table `customers` has the columns `id`, `createdAt`, `updatedAt` and `name`.

## Options

`facts` are what only a running app knows, as the findings of a table change against its data. The check opens no database: whoever calls it passes them in. `forjr check` asks the engine that runs on the data of the project, and `readFacts` of `forjr/engine` where none runs. The rules of `code.F2001` to `code.F2004` pass on what the facts hold, and add the place of the table in the source.
