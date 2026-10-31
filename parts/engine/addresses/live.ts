import { ForjrError } from '../../core/index.ts'
import type { Address } from '../door/address.ts'
import { errorAnswer } from '../wire.ts'

/**
 * `/_f/live`: the live connection. It is opened as a WebSocket, which the web side of the engine hands to the
 * app, and by `app.live` with no network. A plain request for it is not found.
 */
export const address: Address = {
  order: 1,
  match: (request) => new URL(request.url).pathname === '/_f/live' && {},
  steps: [1],
  handle: async ({ app }) =>
    errorAnswer(
      app,
      '/_f/live',
      new ForjrError('F0001', 'The live connection is opened as a WebSocket, and this request asks for none.', {
        fix: 'Open `/_f/live` as a WebSocket, from a page of the app.',
      }),
    ),
}
