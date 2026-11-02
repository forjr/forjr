import assert from 'node:assert/strict'
import { test } from 'node:test'
import { entryText } from '../steps/browser.ts'

test('[14-7] a search-engine field that is code is laid over the stored ones, so a picture, a description and index stay', () => {
  const seo = { description: 'Stored words', image: 'https://example.com/card.png', index: false, data: { code: true } }
  const text = entryText('/app/screens/post.tsx', 'postScreen', { name: 'postScreen', kind: 'screen', seo }, { seo })
  const made = text.split('\n').find((line) => line.startsWith('export default'))
  assert.equal(
    made,
    `export default { ...${JSON.stringify({ name: 'postScreen', kind: 'screen', seo })}, view: o.view, seo: { ...${JSON.stringify(seo)}, data: o.seo.data } };`,
  )
})
