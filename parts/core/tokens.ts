// The rule by which what a server did not count is counted, and by which a map is cut to its size.
const perToken = 3

/** Takes a text. Answers its tokens by the rule: one for every 3 bytes of it as UTF-8, rounded up. */
export const tokenCount = (text: string): number => Math.ceil(new TextEncoder().encode(text).length / perToken)
