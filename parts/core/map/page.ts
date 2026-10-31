import type { Description } from '../description.ts'
import { isStored } from '../record.ts'

/** The bytes of the page, by a release build: of each package, each view and each style file every page loads. */
export interface PageBytes {
  // A package that reaches a browser, by its name.
  packages: Record<string, number>
  // A screen and a component: each file a page loads for it, by its path in the bundle.
  views: Record<string, Record<string, number>>
  // The style files that every page loads.
  styles: Record<string, number>
}

const textList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((one) => typeof one === 'string') : []

/**
 * Takes the description of a release build and the bytes of each file of its bundle, by its path there. Answers the
 * bytes of the page: of each package that reaches a browser, of each file a page loads for a screen and a component
 * of the project, and of each style file that several screens import, which every page loads.
 */
export function pageBytesOf(description: Description, sizes: Record<string, number>): PageBytes {
  const sized = (files: string[]): Record<string, number> =>
    Object.fromEntries(files.map((file) => [file, sizes[file] ?? 0]))
  const packages: Record<string, number> = {}
  for (const [name, used] of Object.entries(description.packages ?? {}))
    if (used.browser === true) packages[name] = typeof used.bytes === 'number' ? used.bytes : 0
  const browser = isStored(description.browser) ? description.browser : {}
  const views: Record<string, Record<string, number>> = {}
  // The views of the project: the error screen of the page code is the framework's own.
  for (const part of ['screens', 'components'] as const)
    for (const [name, files] of Object.entries(isStored(browser[part]) ? browser[part] : {}))
      if (Object.hasOwn(description[part], name)) views[name] = sized(textList(files))
  return { packages, views, styles: sized(textList(browser.styles)) }
}
