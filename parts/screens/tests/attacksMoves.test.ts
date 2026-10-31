import assert from 'node:assert/strict'
import { test } from 'node:test'
import { livingPage } from '../page/alive.ts'
import type { Reach } from '../page/reach.ts'
import type { Page, ViewRecord } from '../page/types.ts'
import { pageOf } from './drawn.ts'
import { isPath } from '../../core/internal.ts'

const list: ViewRecord = { name: 'listScreen', kind: 'screen' }

const first = (): Page =>
  pageOf('listScreen', { path: '/orders', load: { screen: 'list.js', parts: [], styles: [], error: '' } })

/** A reach that writes down every address the page loads whole, moves to, and asks for. */
function world(answer: (path: string) => Page = () => first()) {
  const gone: string[] = []
  const moved: string[] = []
  const asked: string[] = []
  const reach: Reach = {
    post: async () => ({ ok: true, value: null }),
    go: (address) => void gone.push(address),
    get: async (address) => {
      asked.push(address)
      const path = new URL(address, 'http://x').searchParams.get('path') ?? ''
      // An engine answers no screen for an address of another site.
      return path.startsWith('//') || path.includes('\\')
        ? { ok: false, error: { code: 'F0001', message: 'no' } }
        : { ok: true, value: answer(path) }
    },
    load: async () => [],
    shows: () => moved.at(-1) ?? '/orders',
    moved: (address) => void moved.push(address),
  }
  return { reach, gone, moved, asked }
}

const settled = () => new Promise((done) => setTimeout(done, 5))

test('[05-4.3@7c] a move to an address of another site, written as a path, leads nowhere: no move, no whole page and no asking', async () => {
  const at = world()
  const page = livingPage(first(), [list], at.reach)
  for (const address of [
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example',
    '%2F%2Fevil.example',
    '/%5Cevil.example',
  ])
    page.goTo(address)
  await settled()
  const outside = (one: string): boolean => !one.startsWith('/') || one.startsWith('//') || one.includes('\\')
  assert.deepEqual([...at.gone, ...at.moved].filter(outside), [])
  assert.deepEqual(
    at.asked.filter((one) => outside(new URL(one, 'http://x').searchParams.get('path') ?? '')),
    [],
  )
})

test('[05-4.8@7c] a framed page that moves to a screen that may not be framed loads it anew, as a whole page', async () => {
  const framed = (): Page => ({ ...first(), framedBy: 'anyone' })
  const at = world((path) => ({ ...first(), path, screen: 'listScreen', framedBy: null }))
  const page = livingPage(framed(), [list], at.reach)
  page.goTo('/closed')
  await settled()
  assert.deepEqual(at.gone, ['/closed'])
  assert.deepEqual(at.moved, [])
})

test('[05-4.3@7c] a move to a path that leads out of the app once its percent signs are read leads nowhere: no move, no whole page and no asking for it', async () => {
  const gone: string[] = []
  const moved: string[] = []
  const asked: string[] = []
  const reach: Reach = {
    post: async () => ({ ok: true, value: null }),
    go: (address) => void gone.push(address),
    get: async (address) => {
      asked.push(new URL(address, 'http://x').searchParams.get('path') ?? '')
      return { ok: true, value: { ...first(), path: '/orders' } }
    },
    load: async () => [],
    shows: () => moved.at(-1) ?? '/orders',
    moved: (address) => void moved.push(address),
  }
  const page = livingPage(first(), [list], reach)
  for (const address of ['/%2F%2Fevil.example', '/%2f/evil.example', '/%5Cevil.example', '/%09/evil.example'])
    page.goTo(address)
  // A path of the app is asked for, so the page does move.
  page.goTo('/orders/7')
  await new Promise((done) => setTimeout(done, 5))
  assert.ok(asked.includes('/orders/7'), asked.join(' '))
  // Each address that the page loaded, moved to or asked for is a path of the app, also once its signs are read.
  assert.deepEqual(
    [...gone, ...moved, ...asked].filter((one) => !isPath(one.split(/[?#]/)[0])),
    [],
  )
})
