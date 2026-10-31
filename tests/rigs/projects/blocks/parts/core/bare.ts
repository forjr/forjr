// A line comment is no block.
export function bare(): number {
  return 1
}

/** A block that stands two lines above is not right above. */

export const far = (): number => 2
