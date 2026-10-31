# F0019 secret-missing

A secret that is needed has no value, or a sealed column was read or written with no key at hand.

## Details

A column that states `sealed: true` is stored encrypted, each value by itself, under the key of the secrets. With no key at hand a read and a write of such a column fail with this code, which names the table and the column. A row whose sealed columns hold nothing needs no key.

## The fix

Give the engine the key of the secrets: `forjr secrets key` makes one. On a server the key stands in `FORJR_SECRET_KEY`.

## See also

`topic.types`, `topic.errors`
