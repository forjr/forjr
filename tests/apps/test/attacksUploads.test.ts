import assert from 'node:assert/strict'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import type { TestApp, TestBrowser } from '../../../parts/test/index.ts'
import type { Wire } from '../../../parts/test/tests/storms.ts'
import { wireCodeOf, stormed } from '../../../parts/test/tests/storms.ts'

const marked = 'limits: { anyonePerMinute: 100000, callerPerMinute: 100000, screensPerMinute: 100000 },'

/** The project of the files, with limits of its own, and with a line of its `project` where one is given. */
async function opened(
  t: test.TestContext,
  limits = 'filesPerMinute: 100000, uploadsPerMinute: 100000',
  line = '',
): Promise<{ app: TestApp; dataFolder: string }> {
  return stormed(t, 'filed', {
    change: [
      ['forjr.ts', marked, `${line}\n  ${marked.replace(' },', `, ${limits} },`)}`],
      ['forjr.ts', "import { project } from 'forjr'", "import { anyone, project } from 'forjr'"],
    ],
  })
}

const visitorsToo = "uploads: anyone('visitors hand a file in before they sign up'),"

async function signedIn(app: TestApp, email: string, o: { from?: string } = {}): Promise<TestBrowser> {
  const browser = app.browser(o)
  assert.deepEqual(await browser.call('signIn', { email }), { ok: true, caller: 'changed' })
  return browser
}

const bytesOf = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text)

/** The id of the file that an upload answered. */
const idOf = (wire: Wire): string => {
  assert.equal(wire.ok, true, JSON.stringify(wire))
  return String(Object(wire.value).id)
}

/** The first bytes of a PNG picture of a width and a height: its mark, and the head that states its size. */
function png(width: number, height: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(64)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  new DataView(bytes.buffer).setUint32(16, width)
  new DataView(bytes.buffer).setUint32(20, height)
  bytes.set([8, 2, 0, 0, 0], 24)
  return bytes
}

/** What an address of a file answered a browser: its status, the code of a refusal, its headers and its bytes as text. */
async function got(browser: TestBrowser, path: string, headers: Record<string, string> = {}) {
  const answer = await browser.request('GET', path, { headers })
  const kind = answer.headers.get('content-type') ?? ''
  const text = await answer.text()
  const code = kind.startsWith('application/json') ? String(Object(JSON.parse(text)).error?.code) : ''
  return { status: answer.status, code, kind, headers: answer.headers, text }
}

const locked = "default-src 'none'; sandbox"

test('[05-10.7] an uploaded HTML file, an SVG with a script in it, and an HTML file that is named and stated as a picture, each opened by its address, are of the kind that the bytes say, are sent as a download, and can run no script as the app', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  const script = '<script>fetch("/_f/call/whoAmI",{method:"POST"})</script>'
  for (const [bytes, name, stated, kind] of [
    [`<!doctype html><html><body>${script}`, 'page.html', 'text/html', 'text/html'],
    [`<svg xmlns="http://www.w3.org/2000/svg">${script}</svg>`, 'drawing.svg', 'image/svg+xml', 'image/svg+xml'],
    [`<html><body>${script}`, 'cat.png', 'image/png', 'text/html'],
    [`  \n<!-- a note -->\n<BODY onload="alert(1)">`, 'cat.jpg', 'image/jpeg', 'text/html'],
    [`<?xml version="1.0"?><!DOCTYPE svg><svg onload="alert(1)"/>`, 'cat.gif', 'image/gif', 'image/svg+xml'],
    [script, 'notes.txt', 'text/plain', 'text/html'],
  ] as const) {
    const wire = await maya.upload(bytesOf(bytes), { name, kind: stated })
    assert.equal(Object(wire.value).kind, kind, name)
    const file = await got(maya, `/_f/files/${idOf(wire)}`)
    assert.deepEqual(
      [
        file.status,
        file.kind,
        file.headers.get('content-security-policy'),
        file.headers.get('x-content-type-options'),
        file.headers.get('content-disposition')?.split(';')[0],
      ],
      [200, kind, locked, 'nosniff', 'attachment'],
      name,
    )
    // The image door hands out no HTML at all, and whatever it answers is locked the same way.
    const drawn = await got(maya, `/_f/img/${idOf(wire)}?w=320`)
    if (kind === 'text/html') assert.deepEqual([drawn.status, drawn.code], [400, 'F0002'], name)
    else
      assert.deepEqual(
        [drawn.headers.get('content-security-policy'), drawn.headers.get('x-content-type-options')],
        [locked, 'nosniff'],
        name,
      )
  }
})

test('[05-10.7] an SVG that is opened by the address of the image door is sent as a download, as every answer of a file that is not shown in place is', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  const wire = await maya.upload(bytesOf('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), {
    name: 'drawing.svg',
    kind: 'image/svg+xml',
  })
  const drawn = await got(maya, `/_f/img/${idOf(wire)}?w=320`)
  assert.equal(drawn.status, 200)
  assert.equal(drawn.headers.get('content-disposition')?.split(';')[0], 'attachment')
})

test('[05-10.8] [05-10.19] the id of another user’s file is not found when it is asked for, and F2104 when a change stores it, when a function that states system is handed it, and inside a list and a record', async (t) => {
  const { app } = await opened(t)
  const [maya, omar] = [await signedIn(app, 'maya@example.com'), await signedIn(app, 'omar@example.com')]
  const loose = idOf(await maya.upload(bytesOf('the paper of maya'), { name: 'mine.txt', kind: 'text/plain' }))
  const held = idOf(await maya.upload(bytesOf('a paper that a row holds'), { name: 'held.txt', kind: 'text/plain' }))
  assert.equal(wireCodeOf(await maya.call('keepPaper', { title: 'hers', paper: held })), 'ok')
  const picture = idOf(await maya.upload(png(4, 4), { name: 'dot.png', kind: 'image/png' }))
  for (const id of [loose, held, picture]) {
    for (const asker of [omar, app.browser()]) {
      const file = await got(asker, `/_f/files/${id}`)
      assert.deepEqual([file.status, file.code], [404, 'F0001'], id)
      assert.equal(file.text.includes('paper'), false)
      assert.deepEqual([(await got(asker, `/_f/img/${id}?w=320`)).code], ['F0001'], id)
    }
    for (const input of [
      { title: 'stolen', paper: id },
      { title: 'stolen', hidden: id },
      { title: 'stolen', more: [id] },
      { title: 'stolen', front: id },
    ])
      assert.equal(wireCodeOf(await omar.call('keepPaper', input)), 'F2104', JSON.stringify(input))
    assert.equal(wireCodeOf(await omar.call('filedBySystem', { paper: id })), 'F2104', id)
    assert.equal(wireCodeOf(await omar.call('post', { title: 'for all to see', picture: id })), 'F2104', id)
  }
  // An id that names no file is told the same way.
  const none = `${loose.slice(0, 25)}${loose.endsWith('0') ? '1' : '0'}`
  assert.equal(wireCodeOf(await omar.call('keepPaper', { title: 'none', paper: none })), 'F2104')
  assert.equal((await app.rows('papers')).filter((row) => row.title !== 'hers').length, 0)
  assert.equal((await app.rows('notices')).length, 0)
  // An id that travels as a free value holds nothing, and hands nothing out.
  assert.equal(wireCodeOf(await omar.call('keepPaper', { title: 'free', free: { file: loose } })), 'ok')
  assert.equal((await got(omar, `/_f/files/${loose}`)).status, 404)
})

test('[05-10.19] an upload with for left out, or naming another function, that is handed to a strict field is F0002', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  // `nameOf` takes plain text of 1 KB at most.
  const picture = idOf(await maya.upload(png(2, 2), { name: 'dot.png', kind: 'image/png' }))
  const large = idOf(await maya.upload(bytesOf('x'.repeat(2000)), { name: 'large.txt', kind: 'text/plain' }))
  const other = idOf(
    await maya.upload(png(2, 2), { name: 'dot.png', kind: 'image/png', for: 'keepPaper', field: 'paper' }),
  )
  for (const id of [picture, large, other])
    assert.equal(wireCodeOf(await maya.call('nameOf', { paper: id })), 'F0002', id)
  const fits = idOf(await maya.upload(bytesOf('fits'), { name: 'fits.txt', kind: 'text/plain' }))
  assert.deepEqual(await maya.call('nameOf', { paper: fits }), { ok: true, value: 'fits.txt' })
})

test('[05-10.9] an upload one byte over uploadSize is F0003, the 31st of a minute F0005, one that passes looseBytes F0005, one by nobody where uploads is left out F0006, and a name with ../ in it F0002', async (t) => {
  const { app } = await opened(t, "uploadSize: '2 KB', looseBytes: '6 KB', filesPerMinute: 100000")
  app.clock.advance(`${60_000 - (Date.now() % 60_000) + 100} ms`)
  const maya = await signedIn(app, 'maya@example.com')
  assert.equal(wireCodeOf(await maya.upload(bytesOf('x'.repeat(2048)), { name: 'full.txt', kind: 'text/plain' })), 'ok')
  const over = await maya.upload(bytesOf('x'.repeat(2049)), { name: 'over.txt', kind: 'text/plain' })
  assert.equal(wireCodeOf(over), 'F0003')
  // Nobody, where `uploads` is left out.
  assert.equal(wireCodeOf(await app.browser().upload(bytesOf('x'), { name: 'a.txt', kind: 'text/plain' })), 'F0006')
  for (const name of ['../up.txt', '..\\up.txt', 'a/../../b.txt', '/etc/passwd', 'C:\\x.txt', 'a\u0000b', 'a\rb'])
    assert.equal(
      wireCodeOf(await maya.upload(bytesOf('x'), { name, kind: 'text/plain' })),
      'F0002',
      JSON.stringify(name),
    )
  // 6 KB of loose files at a time: the fourth of 2 KB passes it.
  for (let k = 0; k < 2; k++)
    assert.equal(
      wireCodeOf(await maya.upload(bytesOf('x'.repeat(2048)), { name: `f${k}.txt`, kind: 'text/plain' })),
      'ok',
    )
  assert.equal(
    wireCodeOf(await maya.upload(bytesOf('x'.repeat(2048)), { name: 'past.txt', kind: 'text/plain' })),
    'F0005',
  )
  // A thousand uploads of a minute: the 31st, and every one after it, is F0005. Refused ones counted above too.
  const omar = await signedIn(app, 'omar@example.com')
  const codes: string[] = []
  for (let k = 0; k < 1000; k++)
    codes.push(wireCodeOf(await omar.upload(bytesOf('y'), { name: `${k}.txt`, kind: 'text/plain' })))
  assert.deepEqual([codes.indexOf('F0005'), new Set(codes.slice(30)).size], [30, 1])
  assert.equal(
    codes.slice(0, 30).every((code) => code === 'ok'),
    true,
  )
})

test('[05-10.29] a visitor who drops the cookie before every upload, where visitors may upload, is counted by the address: F0005 at looseBytes', async (t) => {
  const { app } = await opened(t, "looseBytes: '3 KB', uploadsPerMinute: 100000", visitorsToo)
  const from = '203.0.113.77'
  const sent: string[] = []
  for (let k = 0; k < 5; k++) {
    // A new browser each time: it carries no visitor cookie.
    const wire = await app.browser({ from }).upload(bytesOf('z'.repeat(1024)), { name: `${k}.txt`, kind: 'text/plain' })
    sent.push(wireCodeOf(wire))
  }
  assert.deepEqual(sent, ['ok', 'ok', 'ok', 'F0005', 'F0005'])
  // An address of the newer kind is counted by its first 64 bits.
  const range: string[] = []
  for (let k = 0; k < 5; k++) {
    const browser = app.browser({ from: `2001:db8:9:9::${(k + 1).toString(16)}` })
    range.push(wireCodeOf(await browser.upload(bytesOf('z'.repeat(1024)), { name: `${k}.txt`, kind: 'text/plain' })))
  }
  assert.deepEqual(range, ['ok', 'ok', 'ok', 'F0005', 'F0005'])
  // Another address is another visitor.
  const other = app.browser({ from: '203.0.113.78' })
  assert.equal(wireCodeOf(await other.upload(bytesOf('z'), { name: 'a.txt', kind: 'text/plain' })), 'ok')
})

test('[05-10.18] where two cookies of the name of the visitor arrive, the caller is no visitor: the file of the visitor is not found', async (t) => {
  const { app } = await opened(t, undefined, visitorsToo)
  const visitor = app.browser()
  const first = await visitor.request('POST', '/_f/files?name=mine.txt', {
    headers: { 'content-type': 'text/plain', 'content-length': '4' },
    body: 'mine',
  })
  const cookie = first.headers.getSetCookie()[0].split(';')[0]
  const id = String(Object(Object(await first.json()).value).id)
  const asked = async (sent: string): Promise<number> => {
    const answer = await app.request(new Request(`http://localhost/_f/files/${id}`, { headers: { cookie: sent } }))
    await answer.arrayBuffer()
    return answer.status
  }
  assert.equal(await asked(cookie), 200)
  const planted = `forjr_visitor.shop=${'0'.repeat(32)}`
  for (const sent of [`${cookie}; ${planted}`, `${planted}; ${cookie}`, `${cookie}; ${cookie}`])
    assert.equal(await asked(sent), 404, sent)
})

test('[05-10.10] [05-10.39] the image door refuses a web address and a width that is not on the list, finds no file that the caller may not read, and a picture of a hundred million points is kept, sent as it is and never opened', async (t) => {
  const { app, dataFolder } = await opened(t)
  const [maya, omar] = [await signedIn(app, 'maya@example.com'), await signedIn(app, 'omar@example.com')]
  const small = idOf(await maya.upload(png(4, 4), { name: 'dot.png', kind: 'image/png' }))
  for (const path of [
    `${encodeURIComponent('https://evil.example/cat.png')}?w=320`,
    'https://evil.example/cat.png?w=320',
    `${encodeURIComponent('//evil.example/cat.png')}?w=320`,
    `${small}?w=321`,
    `${small}?w=10000`,
    `${small}?w=-320`,
    `${small}?w=320.5`,
    `${small}`,
  ])
    assert.deepEqual([(await got(maya, `/_f/img/${path}`)).code], ['F0002'], path)
  // A file that the caller may not read: not found, whatever else is wrong with what is asked for it.
  assert.deepEqual([(await got(omar, `/_f/img/${small}?w=320`)).code], ['F0001'])
  // The head of a picture of ten thousand by ten thousand and one points: its bytes end after the head.
  const huge = png(10_000, 10_001)
  const wire = await maya.upload(huge, { name: 'huge.png', kind: 'image/png' })
  assert.deepEqual(
    [Object(wire.value).kind, Object(wire.value).width, Object(wire.value).height],
    ['image/png', 10_000, 10_001],
  )
  const sent = await maya.request('GET', `/_f/img/${idOf(wire)}?w=320`)
  assert.equal(sent.status, 200)
  assert.deepEqual(new Uint8Array(await sent.arrayBuffer()), huge)
  // No tiny copy is made of it.
  const db = new DatabaseSync(join(dataFolder, 'data.db'), { readOnly: true })
  try {
    assert.deepEqual(
      db
        .prepare('SELECT "tiny" FROM "_f_files" WHERE "id" = ?')
        .all(idOf(wire))
        .map((row) => row.tiny),
      [null],
    )
  } finally {
    db.close()
  }
})

test('[05-10.11] a download that is asked for with a hundred byte ranges is answered one range', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  const text = Array.from({ length: 400 }, (_, at) => String(at % 10)).join('')
  const id = idOf(await maya.upload(bytesOf(text), { name: 'digits.txt', kind: 'text/plain' }))
  const ranges = Array.from({ length: 100 }, (_, at) => `${at * 4}-${at * 4 + 1}`).join(', ')
  const answer = await got(maya, `/_f/files/${id}`, { range: `bytes=${ranges}` })
  assert.deepEqual(
    [
      answer.status,
      answer.kind,
      answer.headers.get('content-range'),
      answer.headers.get('content-length'),
      answer.text,
    ],
    [206, 'text/plain', 'bytes 0-1/400', '2', '01'],
  )
  // A range that cannot be met, and one that reads as none, answer the whole file.
  for (const range of ['bytes=900-', 'bytes=5-2', 'bytes=x', 'lines=1-2', `bytes=${'9'.repeat(400)}-`]) {
    const whole = await got(maya, `/_f/files/${id}`, { range })
    assert.deepEqual([whole.status, whole.text.length], [200, 400], range)
  }
})

test('[05-10.24] the image door asked for an asset named ../description.json, with percent signs and with backslashes, finds none, and a picture that is built to break the resizer is sent as it is', async (t) => {
  const { app } = await opened(t)
  const visitor = app.browser()
  const print = String(Object(Object(app.description.assets)['dot.png']).file)
    .split('.')
    .at(-2)
  assert.equal((await got(visitor, `/_f/img/a/dot.png?w=320&v=${print}`)).status, 200)
  for (const name of [
    '../description.json',
    '%2e%2e%2fdescription.json',
    '..%2fdescription.json',
    '%2e%2e/description.json',
    '..\\description.json',
    '..%5cdescription.json',
    '%2e%2e%5c%2e%2e%5cdescription.json',
    '....//description.json',
    'dot.png/../../description.json',
    '%2e%2e%2f%2e%2e%2fdata%2fdata.db',
  ]) {
    const answer = await got(visitor, `/_f/img/a/${name}?w=320&v=${print}`)
    assert.notEqual(answer.status, 200, name)
    assert.equal(answer.text.includes('"functions"'), false, name)
    // A name that reaches the door with its dots is no asset: not found. One that the address itself walks away, before
    // the door reads it, is the address of no asset and no file: refused.
    if (name.includes('%2f') || name.includes('%5c'))
      assert.deepEqual([answer.status, answer.code], [404, 'F0001'], name)
    else assert.ok(['F0001', 'F0002'].includes(answer.code), `${name} is answered ${answer.status} ${answer.code}`)
  }
  // A picture whose head says it is a picture and whose rest is not one.
  const maya = await signedIn(app, 'maya@example.com')
  const broken = png(64, 64)
  broken.set(new Uint8Array(31).fill(0xff), 33)
  const id = idOf(await maya.upload(broken, { name: 'broken.png', kind: 'image/png' }))
  const sent = await maya.request('GET', `/_f/img/${id}?w=320`)
  assert.equal(sent.status, 200)
  assert.deepEqual(new Uint8Array(await sent.arrayBuffer()), broken)
})

test('[05-10.28] a file whose name holds a quote is downloaded under a header that holds the name with percent signs', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  for (const name of [
    'a".html',
    `x"; filename="evil.exe`,
    "it's (1)*.html",
    'café ü.html',
    'a%22b.html',
    'a;b,c.html',
  ]) {
    const id = idOf(await maya.upload(bytesOf('<html>'), { name, kind: 'text/html' }))
    const header = (await got(maya, `/_f/files/${id}`)).headers.get('content-disposition') ?? ''
    assert.match(header, /^attachment; filename\*=UTF-8''[A-Za-z0-9%._~-]+$/, name)
    assert.equal(decodeURIComponent(header.slice("attachment; filename*=UTF-8''".length)), name)
  }
})

test('[05-10.31] for naming, one after another, functions that the caller may not call and names that are no function is answered alike, F0002: for tells nobody which functions an app has', async (t) => {
  const { app } = await opened(t, undefined, visitorsToo)
  const visitor = app.browser()
  const answers = new Set<string>()
  for (const [fn, field] of [
    ['keepPaper', 'paper'],
    ['filedBySystem', 'paper'],
    ['nameOf', 'paper'],
    ['nothingOfThatName', 'paper'],
    ['constructor', 'paper'],
    ['__proto__', 'paper'],
    ['putText', 'words'],
    ['whoAmI', 'paper'],
  ]) {
    const wire = await visitor.upload(bytesOf('x'), { name: 'a.txt', kind: 'text/plain', for: fn, field })
    assert.equal(wireCodeOf(wire), 'F0002', fn)
    answers.add(JSON.stringify(wire.error))
  }
  assert.equal(answers.size, 1, [...answers].join('\n'))
})

test('[05-10.33] an upload that states no length is F0002, and one that sends more than it stated is closed at the stated length', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  for (const length of [undefined, '', 'many', '-1', '1e3', '0x10']) {
    const answer = await maya.request('POST', '/_f/files?name=a.txt', {
      headers: { 'content-type': 'text/plain', ...(length === undefined ? {} : { 'content-length': length }) },
      ...(length === undefined ? {} : { body: 'abc' }),
    })
    assert.equal(Object(await answer.json()).error?.code, 'F0002', String(length))
  }
  const more = await maya.request('POST', '/_f/files?name=five.txt', {
    headers: { 'content-type': 'text/plain', 'content-length': '5' },
    body: '0123456789',
  })
  const file = Object(Object(await more.json()).value)
  assert.equal(file.size, 5)
  assert.equal((await got(maya, `/_f/files/${file.id}`)).text, '01234')
  // One that sends less than it stated is no file.
  const less = await maya.request('POST', '/_f/files?name=short.txt', {
    headers: { 'content-type': 'text/plain', 'content-length': '50' },
    body: '0123456789',
  })
  assert.equal(Object(await less.json()).error?.code, 'F0002')
})

test('[05-10.20] an upload that a page of another site posts with the cookies of the visitor is F0004, and no file is made', async (t) => {
  const { app } = await opened(t)
  const maya = await signedIn(app, 'maya@example.com')
  for (const site of ['https://evil.example', 'null', 'http://localhost:8080']) {
    const answer = await maya.request('POST', '/_f/files?name=planted.html', {
      headers: { 'content-type': 'text/html', 'content-length': '6', origin: site },
      body: '<html>',
    })
    assert.deepEqual([answer.status, Object(await answer.json()).error?.code], [403, 'F0004'], site)
  }
  assert.equal(wireCodeOf(await maya.upload(bytesOf('x'), { name: 'a.txt', kind: 'text/plain' })), 'ok')
})

test('[05-10.40] an upload that the uploads rule refuses, with 50 MB behind its head, is refused before a byte of its body is read', async (t) => {
  const { app } = await opened(t)
  let read = 0
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      read += 65_536
      controller.enqueue(new Uint8Array(65_536))
    },
  })
  const how: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    headers: {
      'content-type': 'application/octet-stream',
      'content-length': String(50 * 1024 * 1024),
      origin: 'http://localhost',
    },
    body,
    duplex: 'half',
  }
  const answer = await app.request(new Request('http://localhost/_f/files?name=large.bin', how))
  assert.equal(Object(await answer.json()).error?.code, 'F0006')
  // Each hand that a stream passes through asks for one part ahead: no more than those few was taken of 50 MB.
  assert.ok(read <= 16 * 65_536, `${read} bytes of the body were read`)
})

test('[05-10.9] an address of a file whose percent signs read as nothing is not found, and is no error of the app', async (t) => {
  const { app } = await opened(t)
  const visitor = app.browser()
  for (const path of [
    '/_f/files/%zz',
    '/_f/files/%',
    '/_f/files/%e0%a4%a',
    '/_f/img/%zz?w=320',
    '/_f/img/a/%zz?w=320&v=x',
  ]) {
    const answer = await got(visitor, path)
    assert.ok([400, 404].includes(answer.status), `${path} is answered ${answer.status} ${answer.code}`)
  }
})

test('[05-10.9] uploads that arrive at once are held to looseBytes together: a caller does not pass the bound by sending them side by side', async (t) => {
  const { app, dataFolder } = await opened(t, "looseBytes: '1 KB', uploadsPerMinute: 100000")
  const maya = await signedIn(app, 'maya@example.com')
  const sent = await Promise.all(
    Array.from({ length: 8 }, (_, k) =>
      maya.upload(bytesOf('p'.repeat(600)), { name: `${k}.txt`, kind: 'text/plain' }),
    ),
  )
  const db = new DatabaseSync(join(dataFolder, 'data.db'), { readOnly: true })
  try {
    const loose = Number(db.prepare('SELECT sum("size") AS n FROM "_f_files" WHERE "removedAt" IS NULL').get()?.n ?? 0)
    assert.ok(loose <= 1024, `the caller holds ${loose} loose bytes, and looseBytes is 1024`)
  } finally {
    db.close()
  }
  assert.equal(sent.filter((wire) => wire.ok).length, 1)
})

test('[05-10.8] the id of another user’s file that reaches a change as a text is F2104 when the change stores it, and the row is not written; code with full access stores it', async (t) => {
  const { app } = await stormed(t, 'stormed')
  const [maya, omar] = [await signedIn(app, 'maya@example.com'), await signedIn(app, 'omar@example.com')]
  const hers = idOf(await maya.upload(bytesOf('the paper of maya'), { name: 'mine.txt', kind: 'text/plain' }))
  const taken = await omar.call('stash', { id: hers })
  assert.equal(taken.ok, false, JSON.stringify(taken))
  assert.equal((await app.rows('papers')).length, 0)
  assert.equal(
    await app
      .as(String((await app.rows('users')).find((one) => one.email === 'omar@example.com')?.id))
      .call('stash', { id: hers })
      .then(
        () => 'stored',
        (error) => error.code,
      ),
    'F2104',
  )
  // The papers are open to all: had the row been written, everyone could download the file.
  assert.equal((await got(omar, `/_f/files/${hers}`)).status, 404)
  // Code with full access stores any file that is there, and then all may read it, as the table says.
  assert.equal(wireCodeOf(await omar.call('stashAsSystem', { id: hers })), 'ok')
  assert.equal((await got(omar, `/_f/files/${hers}`)).status, 200)
})

test('[05-10.8] a file that code made for a caller who is nobody, where no browser was answered, is no file of every other caller who is nobody', async (t) => {
  const { app } = await opened(t)
  // Made under `app.call`, as a step of a flow or a call of a program makes one: no visitor id can be handed out.
  const id = String(await app.as('nobody').call('putText', { words: 'made for one caller who is nobody' }))
  assert.match(id, /^[0-9a-hjkmnp-tv-z]{26}$/)
  for (const asker of [app.browser(), app.browser({ from: '203.0.113.5' })]) {
    const file = await got(asker, `/_f/files/${id}`)
    assert.deepEqual([file.status, file.text.includes('made for one caller')], [404, false])
  }
})
