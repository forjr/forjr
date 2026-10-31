# Installation

This page walks one app from nothing to a running screen: how `forjr` is run, a table, a query, a screen with its data, a link, a form, a sign-in, the seed and `forjr dev`. Every file below is whole, and the app it makes runs as it is written.

## Running forjr

`forjr` comes with the package `forjr` of npm, which brings the Node.js it runs on:

```sh
npm install -g forjr
```

Each command of these docs is then `forjr <command>`. A project names its own `forjr` in its `package.json`, and `forjr` builds and runs a project with the version it names. A program of your own that imports the framework, as `topic.engine` shows one, finds it in the `forjr` that the project holds.

## A new project

```sh
forjr new my-app
cd my-app
```

`npm create forjr my-app` makes the same project with nothing installed first, by `forjr new` of the newest `forjr`. `forjr new` writes a bare project: `forjr.ts`, `package.json`, `AGENTS.md`, the mark of Forjr as the icon of the site in `assets/icon.svg`, one screen at `/` and the query it reads. The files below take their place. A definition is a top-level `export const` made by a word of `forjr`; `forjr check` after every change reports every mistake at once, each with its fix.

## The project and its people

```ts
// forjr.ts
import { project } from 'forjr'

export const myApp = project('myApp', {
  title: 'My App',
  signInPath: '/sign-in',
})
```

The engine reads `id` and `roles` of each row of `users`; the rest is the project's own. The password is stored as its hash, in a column that no rule lets anyone read.

```ts
// tables/users.ts
import { list, table, text } from 'forjr'

export const users = table('users', {
  columns: {
    email: text({ unique: true, personal: true }),
    name: text({ optional: true, personal: true }),
    password: text({ optional: true, private: true }),
    roles: list(text()),
  },
  access: { read: 'owner' },
})
```
