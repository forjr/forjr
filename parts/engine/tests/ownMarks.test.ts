import assert from 'node:assert/strict'
import { test } from 'node:test'
import { inspectName } from '../pages/inspect.ts'
import { openPiece, partIn, partPiece, withoutPlaces } from '../pages/stream.ts'

const answered = [{ what: 'cart', input: {}, value: { items: 2 } }]

// The single letter that stood for the former name, put together so that this file holds none of its forms.
const formerMark = new RegExp(`data-${'t'}-`)

test('[58-4] the pieces of a streamed page mark its parts, their answers, the record and the places as data-f-, and none holds the former name', () => {
  const piece = partPiece('cart', '<p>Two items</p>', answered, undefined, true, { title: 'Cart' })
  assert.match(piece, /<div data-f-part="cart">/)
  assert.match(piece, /<script type="application\/json" data-f-answers>/)
  assert.match(piece, /<script type="application\/json" data-f-page>/)
  // The line of script that puts a part in its place finds the part, its answers, its record and its place.
  for (const mark of ['data-f-part', 'data-f-answers', 'data-f-page', 'data-f-wait', 'data-f-end'])
    assert.ok(piece.includes(mark), mark)
  assert.doesNotMatch(piece, formerMark)

  const open = openPiece(['late'], answered, undefined, false)
  assert.match(open, /<div data-f-part="open" hidden>/)
  assert.doesNotMatch(open, formerMark)

  const shared =
    '<main><template data-f-wait="late"></template><p>Loading</p><template data-f-end="late"></template></main>'
  assert.equal(withoutPlaces(shared), '<main></main>')
  assert.equal(partIn('<template data-f-done="late"><p>Here</p></template>', 'late'), '<p>Here</p>')
})

test('[58-4] the word of the address that carries a token of the inspect mode holds no letter of the former name', () => {
  assert.doesNotMatch(inspectName, new RegExp(`^${'t'}-`))
})
