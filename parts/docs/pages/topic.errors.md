# Errors

Every failure is a `ForjrError`, which is exported from `forjr`. A query or a change throws it, and a failed action refuses its promise with it.

| Member | Holds |
|---|---|
| `code` | For the framework, `F` and four digits, as `F0002`. For an error of an app's own, the builder's word |
| `name` | The short word of the code, as `bad-input`. For an error of an app's own, the builder's word again |
| `message` | What went wrong, in words |
| `fix` | What to do about it, where that can be said |
| `where` | `{ file, line, definition }`: the place in the project, where there is one |
| `fields` | For each field that failed, by its dotted name, what it failed. An entry of a list is named by its number, as `lines.0.qty` |

```ts
import { ForjrError } from 'forjr'

try {
  await refund({ order })
} catch (error) {
  if (error instanceof ForjrError && error.code === 'F2103') {
    // the order is not there
  }
}
```

Every code of the framework has a page: `forjr docs F0002`.

What the build and the check report is a finding: the same members, with `level`, which is `'error'`, `'warning'` or `'note'`, and `docs`, the command that explains its code.
