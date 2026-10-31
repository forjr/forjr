# F0038 usage

A command was typed with a word, a flag or a value it does not take, or without one it needs. It ran nothing, and ended with 2.

## Details

The finding names what was wrong, and its fix says how the command is typed: `forjr`, its name, and each flag it takes, a flag in brackets where it may be left out, as the reference writes the line of the command. Where a real word is near the one typed, the fix names it first:

```
error F0038
  forjr dev takes no --prot.
  fix: Did you mean --port? It is typed: forjr dev [--port <number>] ...
```

It is raised for a command that is not there, a second word that names none of the commands under one name, a flag that the command does not take, a flag with no value, a word that fills nothing, a value that does not fit the type of its flag, as a number or one of the values of a choice, and a value that the command needs and was not given. `forjr test` raises it for a file or a flag that it does not take beside the one it was given.

Something that went wrong inside a command is never this code: that is `code.F0009`.

## The fix

Type the command as the fix says. `forjr docs command.<name>` prints its page, and `forjr --help` every command.

## See also

`topic.commands`, `code.F0009`
