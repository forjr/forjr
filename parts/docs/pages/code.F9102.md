# F9102 clash-left

`forjr history merge --settle` was typed while the clashes of the merge are still there: `forjr.clash.ts` in the root of the project, or a file that ends in `.theirs`. Nothing was recorded.

## Details

| The case | What it names |
|---|---|
| `forjr.clash.ts` is still in the root of the project | `forjr.clash.ts` |
| A file that ends in `.theirs` is still there, beside a file of bytes that both sides changed | Each such file |

## The fix

For each numbered clash of `forjr.clash.ts`, put the definition you want into its own file: ours is there already, and theirs stands in the clash file under a name of its own, as `openOrders__theirs`. Keep or throw away each `.theirs` file. Then remove `forjr.clash.ts` and every `.theirs` file, and type `forjr history merge --settle` again.

## See also

`command.history`, `topic.history`
