# `uses` of `python`

The functions and the service calls that the Python code may call back.

## Value

A list of them, each as it was imported. Python calls one with `forjr.call('name', input)`, which answers its answer: as the caller of the call, through the rule of that function, and inside the call, so a call that only reads stays one. A name that `uses` does not hold is `code.F0013`. A call that fails raises `forjr.Error` with `code`, `message` and `fields`; one that `run` lets out arrives at the caller as itself. Left out, it may call none.

## Example

```ts
export const churn = python('churn', {
  file: 'ml/churn.py',
  input: { team: link('teams') },
  output: object({ risk: number() }),
  access: role('staff'),
  uses: [hooks.status],
})
```

## See also

`word.python`
