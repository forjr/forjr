import { tokenCount } from '../../core/internal.ts'
import type { ReplyRequest } from '../face.ts'

// What the model layer counts for an image that a server did not count.
const perImage = 1500

/** The tokens of a request by the rule: its instructions, its messages, its tools and its shape, and its images. */
export function sizeByRule(request: Omit<ReplyRequest, 'fetch' | 'signal' | 'model'>): number {
  let text = request.instructions ?? ''
  let images = 0
  for (const message of request.messages) {
    text += message.text ?? ''
    if (message.calls?.length) text += JSON.stringify(message.calls)
    if (message.result !== undefined) text += JSON.stringify(message.result)
    text += message.error ?? ''
    images += message.images?.length ?? 0
  }
  for (const tool of request.tools ?? []) text += tool.name + tool.about + JSON.stringify(tool.input)
  if (request.shape) text += JSON.stringify(request.shape)
  return tokenCount(text) + images * perImage
}
