<div align="center">
  <br>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/forjr/forjr/main/.github/logo-dark.svg">
    <img alt="" src="https://raw.githubusercontent.com/forjr/forjr/main/.github/logo-light.svg" height="28">
  </picture>
  <h1>Forjr</h1>
  <p><strong>The full-stack React framework built for AI.</strong></p>
  <p>Data, flows, AI agents and screens in one TypeScript framework.</p>
  <a href="https://www.npmjs.com/package/forjr"><img alt="npm version" src="https://img.shields.io/npm/v/forjr.svg"></a>
  <a href="https://github.com/forjr/forjr/blob/main/LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-blue.svg"></a>
  <br>
  <br>
</div>

## Quick start

```sh
npm install -g forjr
forjr new my-app
cd my-app && forjr dev
```

The app runs at `http://localhost:3000`, and each save shows in the open page. With nothing installed first, `npm create forjr my-app` makes the same project, and `npx forjr dev` runs it.

## Why Forjr

- **One framework for the whole app.** Data, access rules, background flows, AI agents and React screens are defined in one TypeScript project, and one engine runs them together. No separate database service, queue, workflow tool or auth provider to wire up.
- **Connected both ways.** Call any outside service with its keys, limits and retries handled. Offer your app's functions as an API with access keys, as an MCP server, and as a command line. Receive webhooks from other services.
- **Built for AI to build with.** Every new project comes with an `AGENTS.md`, the full docs ship inside the package, and `forjr map` and `forjr check` give a coding agent the whole app and every problem in it at once.
- **Data with its rules.** A table declares its columns and who may read and change its rows. The engine holds every query to those rules, and open pages update live when the data changes.
- **Agents and flows built in.** Models, tools and long-running flows that survive restarts are part of the app, not separate services.
- **History of the whole app.** Every change is recorded in the app's own terms, and going back brings the data with it.
- **Runs anywhere.** `forjr dev` on your laptop. `forjr start` on any server, with HTTPS for your domains, and many readers beside one writer when one machine is not enough. Open source, MIT licence.

## A small app

In the project that `forjr new` made: a table with who may read and add its rows, a query, a change, and a screen that reads the one and calls the other, in place of the first screen.

```ts
// notes.ts
import { anyone, change, input, query, table, text } from 'forjr'

export const notes = table('notes', {
  columns: { body: text({ min: 1, max: 280 }) },
  access: { read: anyone('the notes are public'), add: anyone('every visitor may sign') },
})

export const latestNotes = query('latestNotes', {
  access: anyone('the notes are public'),
  rows: notes.newest('createdAt').limit(20),
})

export const addNote = change('addNote', {
  access: anyone('every visitor may sign'),
  input: { body: text({ min: 1, max: 280 }) },
  set: notes.add({ body: input('body') }),
})
```

```tsx
// screens/home.tsx
import { anyone, read, screen, Form } from 'forjr/ui'
import { addNote, latestNotes } from '../notes'

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: anyone('the guestbook is public'),
  data: { notes: read(latestNotes) },
  view: ({ notes }) => (
    <main>
      <h1>Guestbook</h1>
      <Form call={addNote}>
        <input name="body" />
        <button type="submit">Sign</button>
      </Form>
      <ul>
        {notes.map((note) => (
          <li key={note.id}>{note.body}</li>
        ))}
      </ul>
    </main>
  ),
})
```

`forjr check` reports every mistake at once, each with its fix, and `forjr dev` runs it.

## Docs

The docs ship inside the package, so they always match the version you run:

- `forjr docs` opens on the first page, which walks one app from nothing.
- `forjr docs <name or code>` prints one page: `forjr docs query`, `forjr docs F1003`.
- `forjr docs --reference` prints every word, option, tag, hook, command and code.

They are also on the site: [forjr.dev](https://forjr.dev).

## Examples

[`examples/`](https://github.com/forjr/forjr/tree/main/examples) holds whole apps built with Forjr, each with a README of how to run it:

- [`orders`](https://github.com/forjr/forjr/tree/main/examples/orders): an orders tool for a shop's staff and customers, with a sign-in, roles, live updates and two languages.
- [`marketing-site`](https://github.com/forjr/forjr/tree/main/examples/marketing-site): the site of a product, in two languages, with a gallery, a contact form and a sitemap.
- [`help-desk`](https://github.com/forjr/forjr/tree/main/examples/help-desk): mail becomes tickets, and an AI agent drafts answers from a guide of PDF files, asks before a refund, and listens and speaks.
- [`app-builder`](https://github.com/forjr/forjr/tree/main/examples/app-builder): people describe an app in a chat and an AI builds it, each in a workspace of their own.
- [`bots`](https://github.com/forjr/forjr/tree/main/examples/bots): always-on bots on your own computer, with a memory each, routines, MCP tools and an ask before anything that sends, pays or deletes.

## Community and contributing

Questions, ideas and bugs go to the [issues](https://github.com/forjr/forjr/issues). To work on Forjr itself, read [CONTRIBUTING.md](https://github.com/forjr/forjr/blob/main/CONTRIBUTING.md).

## Security

Please do not report a security issue in a public issue. [SECURITY.md](https://github.com/forjr/forjr/blob/main/SECURITY.md) says where to send it.

## Licence

[MIT](https://github.com/forjr/forjr/blob/main/LICENSE). Made by Tentis Labs. The parts Forjr ships from others, with their licences, are listed in [THIRD-PARTY.md](https://github.com/forjr/forjr/blob/main/THIRD-PARTY.md).
