/** A function with its block right above it. */
export function blocked(): number {
  return 1
}

/** A value that is a function, with its block. */
export const arrow = (): number => 2

// A value that is no function needs no block.
export const plain = 3

/** One block above the overloads stands for them all. */
export function over(a: number): number
export function over(a: string): string
export function over(a: number | string): number | string {
  return a
}

function own(): number {
  return 4
}

export const used = own
