# `forjr check`

Builds the description of the project, carries out every rule and the type checker, and prints every finding at once. It never stops at the first, and it changes no file of the project but its type list, `forjr.d.ts`. It marks `now` of the history with what it found, after recording a point where the files are no longer those of `now` (`command.history`).

## Usage

```
forjr check [--data <folder>]
```

It is typed in the folder of the project, or in a folder inside it.

## Options

| Option | Does |
|---|---|
| `--data <folder>` | The data folder that the project is held against. Where none is named it is `.forjr/` of the project |

## Example

```
error F1008  functions/orders.ts:14  markPaid
  markPaid: change states no `access`, which is required.
  fix: State `access`.
  more: forjr docs F1008
```

The project is held against its data too: a table change that the rows of the data folder do not bear is `code.F2001` to `code.F2004`, at the place of its table. An engine that runs on the data folder is asked for that, and where none runs the check reads the data itself, to read alone. It needs no bundle and starts no engine, so a project with an error is still held against its data.

Where the tests of the project ran, the check reads what each touched in its last run, as `forjr test` keeps it in `.forjr/tests.json`, and warns of each function, flow, screen, table and route that no test touched, `code.F9004`, with the fix that names `forjr test`. A project whose tests never ran is told nothing of them.

A finding has its level, its code, its file and line, its definition, a sentence, the fix, and the command that explains its code. Under the findings stands each definition with its form, `plain` or `code`, and for a code one what made it so.

## Output

With `--json`:

```json
{ "ok": true, "value": { "definitions": { "openTasks": "plain", "ordersScreen": "code" }, "why": { "ordersScreen": "view: a call of `format`, on line 12" } }, "findings": [] }
```

It ends with 0 when no finding is an error, and with 1 when one is. A warning and a note do not change how it ends.

## See also

`topic.check`, `command.build`, `topic.commands`, `command.test`, `code.F9004`
