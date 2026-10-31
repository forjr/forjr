# `forjr uninstall`

Removes Forjr from this computer: the folder of the install, and the line that put its `bin/` on the path of your terminals. It asks first.

## Usage

```
forjr uninstall
```

## Example

```
forjr uninstall
```

The command asks whether to remove the install. It reads the answer from the terminal, or from its input where no person sits at it: `echo yes | forjr uninstall`. With nobody to answer it removes nothing, and ends with 2.

It is the install's own command: typed in a project, it is never handed to the project's own version. Installed with npm, type it before `npm uninstall -g forjr`, which removes the package: the command then says so.

## Output

With `--json`, the folder it removed:

```json
{ "ok": true, "value": { "removed": "/home/ada/.forjr" }, "findings": [] }
```

After a no, `removed` is `false` and nothing was removed. On Windows a program file of the very command that removes the install goes a moment after the command has ended.

## Errors

`code.F0013` where nobody answered the question, and where the folder holds no install.

## See also

`topic.commands`
