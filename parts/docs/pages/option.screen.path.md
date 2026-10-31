# `path` of `screen`

The address of the screen.

## Value

Text that starts with `/`. A part that starts with a colon is a value, which the view reads as text under `params`: `/orders/:id` gives `params.id`. A last part `*` takes the rest of the address, as `params.rest`, and an empty rest too: `/docs/*` answers `/docs` where no screen stands at `/docs`, and a screen at `/docs` answers it where one does. A screen states `path` or `for`, never both and never neither. An address under `/_f/`, and one whose first part is the code of a language of the project, could never be reached and is refused.

## Example

```tsx
import { screen } from 'forjr/ui'

export const ordersScreen = screen('ordersScreen', {
  path: '/orders/:id',
  access: 'signedIn',
  view: ({ params }) => <p>Order {params.id}</p>,
})
```

## Errors

`code.F1007`: `for` is stated too.

`code.F1008`: neither `path` nor `for` is stated.

`code.F1014`: the address does not start with `/`, starts with `/_f/`, or starts with the code of a language.

## See also

`word.screen`, `option.screen.for`
