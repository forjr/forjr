# `forjr models`

Lists every model of the project with what it can do, and with `test` tries each fixed call of a model against its real server. Nothing calls a provider by itself: `test` is run by hand.

## Usage

```
forjr models
forjr models test [name] [--data <folder>]
```

## Options

| Option | Means |
|---|---|
| `test` | Sends one small request for each fixed call that a model has - `reply`, `fill`, `embed`, `hear`, `speak` - to its server, with the key of its secret, and says which the server answered |
| `[name]` | Of `test`: the model to try. Left out, every model of the app is tried |
| `--data <folder>` | Of `test`: the data folder of the engine to ask. Left out, it is `.forjr/` of the project, and with no engine running there one is started for the length of the command, on the development data |

## Example

```
forjr models test writer
```

## Output

With `--json`, `forjr models` prints each model: its name, its provider and its name there, its abilities and the most tokens one request may hold, as the definition states them or the list of its provider knows them, its voices, whether it is a function, its limits and its fall-backs:

```json
{ "ok": true, "value": [{ "name": "writer", "provider": "anthropic", "model": "claude-sonnet-5-5", "abilities": ["reply", "tools", "typedAnswers", "images", "reasoning"], "takes": 200000, "function": false, "limits": { "perDay": { "tokensOut": 2000000 } }, "fallback": ["backup"] }], "findings": [] }
```

`forjr models test` prints, for each model it tried, each call with whether its server answered it, and the code and the words where it did not, and for a model with the ability `reasoning` whether its reasoning arrived:

```json
{ "ok": true, "value": [{ "name": "writer", "calls": { "reply": { "ok": true }, "fill": { "ok": false, "code": "F7110", "message": "The model writer did not accept the request: ..." } }, "reasoning": true }], "findings": [] }
```

Every request is counted and logged as any model call is, and a limit of use holds it too.

## Errors

`code.F0001` where `test` names no model of the app.

## See also

`word.model`, `adapter.Provider`, `code.F7001`
