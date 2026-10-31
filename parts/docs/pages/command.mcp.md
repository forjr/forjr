# `forjr mcp`

A server of MCP on this computer, for an AI that builds the app with you: it offers the project's commands as tools. Its client starts it, as a program, and speaks to it over its input and its output in the standard's form for such a program, one message on each line. It needs no sign-in. `forjr mcp approve` asks an outside MCP server for its tools and approves them.

## Usage

```
forjr mcp [--data <folder>]
forjr mcp approve <service> [--as <user id>] [--data <folder>]
```

A client names `forjr mcp` as the program to start in the folder of the project, as `{ "command": "forjr", "args": ["mcp"] }`.

`forjr mcp approve` asks an outside MCP server for its tools, through the engine, with the values of the service's auth, or with `--as` with the connection of that user. It shows each tool with its description and its input, and writes them with their fingerprints into `mcp.lock.json` in the root of the project, in place of what the file held of that service: `{ "<service>": { "tools": { "<tool>": { "about", "schema", "fingerprint" } } } }`. The build makes each a call of the service. See `option.service.mcp`.

## Options

| Option | Means |
|---|---|
| `--data <folder>` | The data folder of the engine: of `forjr mcp`, the one whose mode it tells when it starts; of `forjr mcp approve`, the one that asks the server. Left out, it is `.forjr/` of the project |
| `--as <user id>` | Of `forjr mcp approve`: the user whose connection asks a server with `oauth` |

## Output

`forjr mcp` offers these tools:

| Tool | Is | Only reads |
|---|---|---|
| `forjr_map` | `command.map`, which takes a name, a column or a file as `name` | yes |
| `forjr_docs` | `command.docs` | yes |
| `forjr_check` | `command.check` | yes |
| `forjr_run` | `command.run` | no |
| `forjr_rows` | `forjr data rows` (`command.data`) | yes |
| `forjr_logs` | `command.logs` | yes |
| `forjr_shot` | `command.shot` | yes |
| `forjr_history` | `command.history` | yes |

The input of each tool is the options of its command, by their names, and its answer is what the command prints with `--json`: `{ ok, value, findings }`. An input that does not fit the options is the tool's error, `code.F0002`.

The tools that need an engine reach it as their commands do: through `data` of their input, or `.forjr/` of the project. So `forjr_run` acts as the caller its `as` names, and as the system where it is left out. Beside an engine on live data, `forjr mcp` says so on its error output when it starts.

`forjr mcp approve` with `--json` prints `{ "written", "tools" }`, each tool by its dotted name.

## See also

`topic.mcp`, `topic.commands`, `command.run`, `option.service.mcp`, `code.F7112`
