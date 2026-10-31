import { ForjrError } from '../errors.ts'

/**
 * Takes a code of the builder's own, words for the user, and the fields that failed, each with the builder's words
 * for it. It never returns: it throws the `ForjrError` that ends a query, a change or an action with an error the
 * caller sees. A code or a message that is no text is F0027: an error is made of text. A code of the form of a
 * framework code is F0013, since a caller would be sent what the framework means by it.
 */
export function fail(code: string, message: string, o?: { fields?: Record<string, string> }): never {
  if (typeof code !== 'string' || typeof message !== 'string')
    throw new ForjrError('F0027', 'fail cannot work with a code or a message that is no text.')
  if (/^F\d{4}$/.test(code))
    throw new ForjrError('F0013', `fail was handed ${code}, which has the form of a code of the framework.`, {
      fix: "Use a code of your own: a lowercase word with letters, digits and hyphens, as `fail('sold-out', ...)`.",
    })
  throw new ForjrError(code, message, o?.fields === undefined ? {} : { fields: o.fields })
}
