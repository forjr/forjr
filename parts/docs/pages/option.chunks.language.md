# `language` of `chunks`

The language whose sentence rules are used.

## Value

The code of a language that the runtime has sentence rules for. `'en'` when left out.

## Example

```ts
const parts = chunks(text, { cut: 'sentence', language: 'tr' })
```

## Errors

`code.F0002`: a value that is not allowed.

## See also

`word.chunks`
