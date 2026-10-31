import type { Description } from '../../core/internal.ts'
import { asText, pageHead, grantWordOf } from './words.ts'

/** What the page that asks a person shows and sends. */
export interface GrantShown {
  language: string
  // The client's name, the host the page names, and whether it named itself.
  name: string
  host: string
  named: boolean
  scopes: string[]
  for: 'mcp' | 'app'
  word?: string
  // The text of the engine's own that the form posts.
  text: string
}

/**
 * The page of the engine's own that asks a person: who asks, by its name and the host of its document in plain
 * letters, and for what, with "Allow" and "Refuse". It is plain HTML with no script, in the system's colors
 * and the language of the request; every text is written as text.
 */
export function grantPage(description: Description, shown: GrantShown): string {
  const said = (key: string, filled: Record<string, string> = {}): string =>
    asText(grantWordOf(description, shown.language, key, filled))
  const title = asText(String(description.project.title ?? description.app.name))
  const asks = shown.scopes.map((scope) =>
    scope === 'read' || scope === 'write'
      ? said(`forjr.grant.${scope}`)
      : asText(
          grantWordOf(description, shown.language, `forjr.grant.scope.${scope}`, {}).replace(
            /^forjr\.grant\.scope\./,
            '',
          ),
        ),
  )
  return [
    pageHead(shown.language, said('forjr.grant.title', { name: shown.name, app: title })),
    '<body><main>',
    `<h1>${said('forjr.grant.title', { name: shown.name, app: title })}</h1>`,
    `<p>${asText(shown.host)}</p>`,
    ...(shown.named ? [`<p>${said('forjr.grant.named')}</p>`] : []),
    `<ul>${asks.map((one) => `<li>${one}</li>`).join('')}</ul>`,
    ...(shown.for === 'app' ? [`<p>${said('forjr.grant.app')}</p>`] : []),
    ...(shown.word ? [`<p>${said('forjr.grant.word', { word: shown.word })}</p>`] : []),
    '<form method="post" action="/_f/oauth/decide">',
    `<input type="hidden" name="t" value="${asText(shown.text)}">`,
    `<button type="submit" name="answer" value="allow">${said('forjr.grant.allow')}</button>`,
    `<button type="submit" name="answer" value="refuse">${said('forjr.grant.refuse')}</button>`,
    '</form></main></body></html>',
  ].join('\n')
}
