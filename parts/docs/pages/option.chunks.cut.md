# `cut` of `chunks`

Where a chunk may end.

## Value

`'paragraph'`, `'sentence'` or `'length'`. `'paragraph'` when left out.

## Example

```ts
const parts = chunks(text, { cut: 'sentence' })
```

## Errors

`code.F0002`: a value that is not allowed.

## See also

`word.chunks`
