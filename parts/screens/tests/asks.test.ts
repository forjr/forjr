import assert from 'node:assert/strict'
import { test } from 'node:test'
import { asksOf } from '../page/asks.ts'

/** A stand-in for `fetch` of a browser: it keeps what each request carried, and answers each with the next `Forjr-At`. */
function fetched(at: (string | undefined)[]) {
  const sent: { address: string; method: string; after: string | null; cookies: unknown }[] = []
  const fetch = async (address: string, how: RequestInit = {}): Promise<Response> => {
    sent.push({
      address,
      method: how.method ?? 'GET',
      after: new Headers(how.headers).get('forjr-after'),
      cookies: how.credentials,
    })
    const stands = at.shift()
    return new Response('{"ok":true,"value":1}', { headers: stands === undefined ? {} : { 'forjr-at': stands } })
  }
  return { sent, fetch }
}

test('[29-4@6] the page keeps the highest Forjr-At it was answered, and sends it as Forjr-After with every call, read and request for a screen, never a lower one', async () => {
  const { sent, fetch } = fetched(['3.7', '3.5', undefined, '4.1', 'no mark'])
  const asks = asksOf(fetch)
  // Before any answer the page has seen nothing, and names nothing.
  assert.equal(asks.seen(), undefined)
  assert.deepEqual(await asks.post('/_f/call/addOrder', { input: {} }), { ok: true, value: 1 })
  assert.equal(asks.seen(), '3.7')
  // A read, a request for a screen and a call each name what the page has seen: an older answer lowers nothing,
  // and neither does one that names no write.
  await asks.post('/_f/read/listOrders', { input: {} })
  await asks.get('/_f/screen?path=%2F&version=v1')
  await asks.post('/_f/call/addOrder', { input: {} })
  await asks.get('/_f/screen?path=%2F&version=v1')
  await asks.post('/_f/read/listOrders', { input: {} })
  assert.deepEqual(
    sent.map((one) => [one.method, one.address.split('?')[0], one.after]),
    [
      ['POST', '/_f/call/addOrder', null],
      ['POST', '/_f/read/listOrders', '3.7'],
      ['GET', '/_f/screen', '3.7'],
      ['POST', '/_f/call/addOrder', '3.7'],
      ['GET', '/_f/screen', '4.1'],
      ['POST', '/_f/read/listOrders', '4.1'],
    ],
  )
  assert.equal(asks.seen(), '4.1')
  // A live message names the write it stands at too, and what the page asks next names it.
  asks.saw('4.9')
  asks.saw('4.2')
  await asks.get('/_f/screen?path=%2F&version=v1')
  assert.equal(sent.at(-1)?.after, '4.9')
  // Every request carries the cookies of this site.
  assert.deepEqual([...new Set(sent.map((one) => one.cookies))], ['same-origin'])
})
