# `forjr map`

Prints the app for the AI that reads it: each definition on one line with its file and line, who may call it, what it reads and writes, who uses it and its tests, the heaviest first, cut to a size in tokens. `forjr map <name>`, `<table>.<column>` or `<file>` gives that one thing whole.

## Usage

```
forjr map [<name, column or file>] [--size <tokens>] [--all] [--data <folder>]
```

## Options

| Option | Means |
|---|---|
| `<name, column or file>` | One thing alone: a definition by its name, `event:<name>` and `package:<name>`, a column as `<table>.<column>`, or a file of the project by its path |
| `--size <tokens>` | How many tokens the map of the app may take, by the rule of one token for every 3 bytes. 1,500 when left out |
| `--all` | Every definition, with no cut |
| `--data <folder>` | The data folder of a `forjr dev` that answers the map. Left out, it is `.forjr/` of the project |

## Example

```
forjr map markPaid
```

**One line for each definition**, two spaces between its fields, a field that holds nothing left out: its kind and name, its file and line, its rule in words, what narrows it (`owner placedBy`, a column's own `read`, `danger ask`, `sends no`), its doors (`offered api`, an address, `GET /feed.xml`, `command report`, `every 1 hour`), the columns of a table (`note?` where a row may leave it out, `customer (customers)` for a link, `status? open|paid` for a choice), its bytes in the browser, its edges out and in, and its tests:

```
maps  no test record: run forjr test
~ seen in the code; code: its code may reach more than is named
query openOrders  functions/orders.ts:5  anyone signed in  offered api  reads customers.*, orders.*
table orders  tables/orders.ts:5  read anyone signed in, add anyone signed in, change role staff  customer (customers), total, status? open|paid  links to customers  read by openOrders, ~markPaid  written by addOrder, ~markPaid
change markPaid  functions/orders.ts:17  role staff  reads ~orders  writes ~orders.status, ~orders.total  emits ~paid  code
```

**The edges** are said in words, out and in: `reads` and `read by`, `writes` and `written by`, `rule reads` and `read by the rule of`, `links to` and `linked from`, `asks` and `asked by`, `calls` and `called by`, `starts` and `started by`, `draws` and `drawn by`, `uses` and `used by`, `holds` and `held by`, `model` and `model of`, `service` and `service of`, `keeps memory in` and `memory of`, `on` and `wakes`, `emits` and `emitted by`, `filled by` and `fills`, `keeps` and `kept by`, `backfills` and `backfilled by`, `imports` and `imported by`. A function and a flow whose columns are known say them: `reads customers.*, orders.status` for the whole rows of a table and each other column, `writes orders.status`, `removes orders`. A group holds four names, then `and <n> more`.

**What was seen in the code** carries `~`: the build reads the code of each function, flow, route, command and backfill written as code for the tables it reads and writes through `db`, the columns it sets with values written in place, the functions it calls, the flows it starts and the events it emits by a name written as text. A definition whose code may reach more than its edges name ends with `code`, and so does one whose rule is written as code, which may read any table; what a helper does for it, or a name worked out at run time, stays unseen.

**The weight** orders the lines: the share of a walk that starts at the doors of the app and follows the edges out, so a table that many doored screens reach through their functions comes first. One project gives one map.

**The bytes in the page** come from a release build made for the map into a folder of its own, which is removed, so no bundle is left in the project (the build keeps its own cache in `.forjr/cache/`, as every build does): a package that reaches a browser, and the sum of the files a page loads for a screen and a component, on its line; each file with its bytes in `forjr map <name>`; and the style files every page loads on the first line, `browser styles <n> bytes`. A project that cannot be built for release is mapped as it is described, says `no page bytes: it does not build for release` on its first line, and answers its errors as findings. A column, and a file that holds no definition, need no bytes and no release build.

**The tests** of each definition come from the record of `forjr test`, `.forjr/tests.json`: `2 tests`, `1 test`, or `no test`. Where the tests never ran, the first line says `no test record: run forjr test`.

**One thing whole.** `forjr map <name>` gives its line with every group whole, `<file>:<line>-<last>`, its text, the columns it reads and writes, the bytes of each file a page loads for a screen, each edge with the line of the definition at its other end, and each test that touched it. `forjr map <table>.<column>` gives the definitions that read it, those that write it, and those whose code may reach it. `forjr map <file>` gives the line of each definition the file holds, and for a file that holds none, the files it imports and the files that import it. A word that names nothing is `code.F0001`, with the nearest name.

**With `forjr dev` running**, the map is answered by its session: a save just made is in it, and the bytes of the page are those of the last release build it made for the map, while no file it read changed since; the release build waits for the build of a save under way, and two maps asked at once share one.

## Output

With `--json`, the map as data:

```json
{ "ok": true, "value": { "app": "maps", "page": "built", "tests": false, "box": false, "lines": [{ "name": "markPaid", "kind": "change", "file": "functions/orders.ts", "line": 17, "rule": "role staff", "doors": [], "out": [{ "kind": "writes", "name": "orders", "by": "seen" }], "in": [], "sets": ["orders.status", "orders.total"], "code": true, "weight": 0.05 }], "more": 0 }, "findings": [] }
```

`forjr map <name>` answers `{ line, last, text, near, tests }`, a column `{ column, words, reads, writes, mayReach }`, a file `{ file, lines }`, and a file that holds no definition `{ file, imports, importedBy }`.

## Errors

`code.F0001` for a word that names no definition, column or file.

## See also

`command.impact`, `command.check`, `command.test`, `topic.commands`
