import { ForjrError } from '../../core/index.ts'

/** The headers that a reader adds to a request it hands on, and that no other sender may set. */
export const handed = ['forjr-reader', 'forjr-epoch', 'forjr-for', 'forjr-ref', 'forjr-trace']

/** The error of a request that carries what only a reader sets, with no key of a reader behind it. */
export const notHanded = (): ForjrError =>
  new ForjrError('F0001', 'Nothing answers this request.', { fix: 'A machine hands a request on with its own key.' })

/** Answers a request without the headers that a reader adds, and what each of them held. */
export function withoutHanded(request: Request): { clean: Request; sent: Record<string, string | null> } {
  const sent = Object.fromEntries(handed.map((name) => [name, request.headers.get(name)]))
  const headers = new Headers(request.headers)
  for (const name of handed) headers.delete(name)
  return { clean: new Request(request, { headers }), sent }
}

/** Whether what a request held of those headers names something that only a reader with a key may say. */
export const saysMore = (sent: Record<string, string | null>): boolean =>
  ['forjr-reader', 'forjr-for', 'forjr-epoch'].some((name) => sent[name] !== null)
