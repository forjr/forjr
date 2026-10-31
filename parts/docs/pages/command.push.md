# `forjr push`

Sends the points of the history that a server lacks and moves the server's branch of the name that `now` follows, so that several people who work on one project share it (`topic.history.engine`).

## Usage

```
forjr push [--to <name or address>] [--unchecked] [--insecure <host>] [--data <folder>]
```

## Options

| Option | Means |
|---|---|
| `--to <name or address>` | The server, by the name `forjr login` kept its key under, or by its address |
| `--unchecked` | Pushes a head that did not pass the check on this computer, to share work that does not pass yet. It is still never published |
| `--insecure <host>` | Reaches that host over a plain connection, for two machines on a network of their own. The server must be started with `--insecure` too |
| `--data <folder>` | The data folder that holds `history.db`. Left out, it is `.forjr/` of the project |

## Example

```
forjr access key add laptop --right push        # on the server
forjr login https://shop.example.com            # here, with that key
forjr push --to live
```

The points are sent oldest first, each after the bytes of its own files; only what the server lacks is sent, a file larger than `syncSize` travels in a request of its own, and many points travel in pages. A head that holds no word of the check is built and checked first, and marked: so `forjr check` and then `forjr push` work with no `forjr dev` running.

Where the server's branch still stands where this computer last saw it, it moves to the pushed point. Where someone else pushed since, the server merges by itself, with no model: where no part of the app that one side changed is one that the other changed, it describes the merged project and holds it to the rules of the check, with no bundle built; where they pass, it records a point of the kind `merge` and moves the branch to it, and your next `forjr pull` brings it. Where both changed one thing, or the merged project does not pass, as a column renamed beside a new query that reads its old name, the push is refused with F9103 and nothing on the server moves: `forjr pull` first. Pushes to one branch are merged one at a time.

## Output

With `--json`:

```json
{ "ok": true, "value": { "points": 3, "blobs": 7, "to": "live", "branch": "main" }, "findings": [] }
```

## Errors

`code.F9101` for a head that did not pass the check here, or is a merge with clashes that are not settled. `code.F9103` where the server does not take the push. `code.F9104` for a key without the right `push`. `code.F9107` for a point or bytes that do not fit. `code.F0001` where no key is kept for the target. A command that fails ends with 2.

## See also

`command.pull`, `command.login`, `command.history`, `topic.history`
