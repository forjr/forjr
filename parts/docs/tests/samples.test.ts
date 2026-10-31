import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findPage } from '../index.ts'

// What the builders of the sample apps found missing from the pages, each held where they looked for it.

/** The text of a page, which must be there. */
function pageOf(name: string): string {
  const page = findPage(name)
  assert.ok(page, `the page ${name} is there`)
  return page.text
}

/**
 * The section of a page under its `## ` heading, or from the top of a page whose title the heading is, with no
 * heading of its own after it.
 */
function sectionOf(name: string, heading: string): string {
  const text = pageOf(name)
  const start = text.startsWith(`# ${heading}\n`) ? 0 : text.indexOf(`\n## ${heading}\n`)
  assert.ok(start >= 0, `${name} has the section ${heading}`)
  const end = text.indexOf('\n## ', start + 1)
  return text.slice(start, end < 0 ? undefined : end)
}

/** Holds that each page says each thing it is asked to say. */
function says(said: [string, RegExp][]): void {
  const missing = said.filter(([name, words]) => !words.test(pageOf(name))).map(([name, words]) => `${name} ${words}`)
  assert.deepEqual(missing, [])
}

test('[03-5] the pages say what the builder of sample app 1 looked for: a step back, set, the type of a path, the output of a query, the settings of the type checker, a field of money, the end of forjr dev', () => {
  says([
    ['tag.Link', /popstate/],
    ['tag.Link', /`\/\$\{string\}`/],
    ['tag.Form', /`\/\$\{string\}`/],
    ['word.screen', /`set` takes/],
    ['option.query.run', /`code\.F0009`/],
    ['option.query.run', /output: object\(/],
    ['topic.build', /`tsconfig\.json`/],
    ['topic.build', /`walk\/`/],
    ['hook.useField', /cents/],
    ['hook.useField', /field\.set\(/],
    ['command.dev', /0 takes a free one/],
    ['command.dev', /`command\.start`/],
  ])
})

test('[03-5] the pages say what the builder of sample app 2 looked for: data above the arrows over it, set, what a sitemap is counted by, a move in a view transition, how long a state of the device lasts, the browser of a driver of its own', () => {
  says([
    ['option.screen.title', /after `data`/],
    ['option.screen.seo', /after `data`/],
    ['option.screen.view', /set\(\{ tab: 'paid' \}\)/],
    ['option.screen.state', /a year/],
    ['topic.look.motion', /startViewTransition/],
    ['topic.tests.driver', /playwright install/],
  ])
  const counts = sectionOf('topic.engine.counts', 'The counts of a minute')
  assert.match(counts, /`\/sitemap\.xml`/)
  assert.match(counts, /`\/_f\/health`/)
})

test('[03-5] the pages say what the builder of sample app 3 looked for: a faked model, a key at the command line, a whole memory table, an answer as it arrives, what was heard, a browser of its own, which files are tests', () => {
  says([
    ['topic.tests.model', /^# A faked model\n/],
    ['topic.tests.model', /calls: \[\{ tool: '\w+', with:/],
    ['topic.tests.model', /as one part/],
    ['topic.tests.model', /fail: 'server'/],
    ['topic.tests.services', /Authorization: Bearer/],
    ['topic.tests.driver', /--port 0/],
    ['topic.tests.driver', /use-file-for-fake-audio-capture/],
    ['topic.tests', /every `\.ts` and `\.tsx` file under `tests\/`/],
    ['topic.tests', /a flow[^.]*`unknown`/],
    ['adapter.Provider', /`fail`/],
    ['code.F7007', /owner: 'by'/],
    ['hook.useAgent', /`who: 'user'`/],
  ])
})

test('[03-5] the pages say what the builder of sample app 4 looked for: a model faked in a program, the person of a workspace, a name with its port, live, working, the rows of a memory, the commands of a box, an undo that a table change refuses, and how packages are installed', () => {
  says([
    ['topic.workspaces', /providers: \(\) =>/],
    ['topic.workspaces', /`forjr_`/],
    ['topic.workspaces.turn', /`code\.F2003`/],
    ['topic.engine.web', /with its port/],
    ['handle.workspaces', /`\{ version, address \}`/],
    ['word.agent', /helper\.working/],
    ['code.F7007', /`\{ calls: \[\{ id, tool, input \}\] \}`/],
    ['adapter.Sandbox', /`forjr check --json`/],
    ['topic.look', /`npm ci /],
  ])
})

test('[03-5] the pages say what the builder of the docs site looked for: how a program reads the pages, the folder the code of an app runs in, and the other case of F0006', () => {
  says([
    ['command.docs', /`pages\/`/],
    ['command.docs', /`llms\.txt`/],
    ['word.seed', /working folder/],
    ['command.start', /working folder/],
    ['code.F0006', /for whoever started it/],
  ])
})

test('[03-5] the pages say what the first builder of the docs site looked for: a package of fonts of fixed weights, a style file for each weight, and its family by its plain name', () => {
  const fonts = sectionOf('topic.look.fonts', 'Fonts')
  assert.match(fonts, /`@fontsource-variable\/inter`/)
  assert.match(fonts, /import '@fontsource\/inter\/700\.css'/)
  assert.match(fonts, /font-family: "Inter",/)
})

test('[03-5] the page of the look gives one way end to end: Tailwind CSS by its plugin, daisyUI, Recharts, light and dark, one scale of type and of spacing, each state of a screen, what draws where, and how the packages are installed', () => {
  const recipe = sectionOf('topic.look', 'One look, end to end')
  for (const [what, words] of [
    ['the packages, each by forjr add', /forjr add tailwindcss[\s\S]*forjr add daisyui[\s\S]*forjr add recharts/],
    ['how a copy installs them', /`npm ci --ignore-scripts`/],
    ['the plugin of Tailwind CSS', /plugins: \[tailwindcss\(\)\]/],
    ['daisyUI in the style file', /@plugin "daisyui";/],
    ['light and dark in one place', /dark/],
    ['one type scale and one spacing scale', /type scale[\s\S]*spacing scale/],
    ['the layout that imports the style file', /layout: AppFrame/],
    ['the chart', /<BarChart/],
    ['the empty state', /\| Empty \|/],
    ['the loading state', /\| Loading \|/],
    ['the error state', /\| Error \|/],
    ['the focus state', /\| Focus \|/],
    ['the hover state', /\| Hover \|/],
    ['what is in no first HTML', /in the browser alone: the first HTML holds its empty box/],
  ] as const)
    assert.match(recipe, words, `the recipe holds ${what}`)
})

test('[03-5] the page of the data and the way out says that the data is SQLite files, the pages React, the ways out, and what is written in the framework words, and the first page names it', () => {
  const page = pageOf('topic.leaving')
  for (const [what, words] of [
    ['the data as SQLite files of the data folder', /`data\.db`[\s\S]*SQLite/],
    ['a tool that opens them', /`sqlite3`/],
    ['how a row is kept', /milliseconds since 1970/],
    ['the pages as React', /## The pages are React/],
    ['the rows', /`forjr data rows <table>`/],
    ['a backup', /`forjr data backup`/],
    ['the public pages', /`forjr export`/],
    ['the history to git', /`forjr history export/],
    ['what is written in the framework words', /## What is written in the framework's words/],
  ] as const)
    assert.match(page, words, `the page says ${what}`)
  assert.doesNotMatch(page, /\b(?:cannot|can't|can not)\b/, 'the page says the facts and the way forward')
  assert.match(pageOf('topic.start.dev'), /`topic\.leaving`/)
})

test('[03-5] the pages say what the newcomer of the trial of the first part looked for: a search in the address, every row while no words are given, words and pieces, the id of a user, a word in place of a flag, pages in a screen', () => {
  says([
    ['topic.screens.lists', /^# A list with a search and pages\n/],
    ['topic.screens.lists', /set\(\{ words: /],
    ['topic.screens.lists', /after: undefined/],
    ['topic.plans', /An empty text finds every row/],
    ['code.F1014', /search\(given\(/],
    ['option.table.search', /three characters/],
    ['topic.users', /forjr data rows users/],
    ['topic.users', /forjr cli/],
    ['topic.commands', /`forjr new --name my-app`/],
  ])
})

test('[03-5] the pages say what the second pass of sample app 1 looked for: where the loading component stands, and a link that a library draws as pressed', () => {
  says([
    ['option.screen.loading', /inside its `layout`/],
    ['option.screen.loading', /`loadingAfter`/],
    ['tag.Link', /as pressed[^.]*`exact`/],
  ])
})

test('[03-5] the pages say what the second pass of sample app 2 looked for: the other languages of a page, the three browsers of a driver, and what a count of a minute is kept by', () => {
  says([
    ['option.screen.seo', /<link rel="alternate" hreflang=/],
    ['option.project.languages', /hreflang/],
    ['topic.tests.driver', /npx playwright install chromium firefox webkit/],
  ])
  const counts = sectionOf('topic.engine.counts', 'The counts of a minute')
  assert.match(counts, /minute of the clock/)
  assert.match(counts, /`127\.0\.0\.1`/)
})

test('[03-5] the pages say what the second pass of sample app 3 looked for: the body of a call coming in, faked models over a port, a picture while the page moves, and a microphone beside Chromium', () => {
  says([
    ['word.incoming', /event\?\.body/],
    ['word.incoming', /`json\(\)`/],
    ['topic.tests.driver', /media\.navigator\.streams\.fake/],
    ['topic.tests.driver', /reducedMotion/],
    ['topic.tests.driver', /as the page stands/],
  ])
  assert.match(sectionOf('topic.tests.driver', 'A driver of your own'), /`makers\.providers`/)
})

test('[03-5] the pages say what the second pass of sample app 4 looked for: whose request a program holds, where the pointed place stands, what an undo leaves of the conversation, and how a program of your own is started', () => {
  says([
    ['topic.workspaces', /`app\.caller\(request\)`/],
    ['topic.engine.web', /`app\.caller\(request\)`/],
    ['code.F7007', /The person points at the tag/],
    ['topic.workspaces.turn', /The person points at the tag/],
    ['topic.workspaces.turn', /memory table[^.]*stay/],
    ['topic.engine', /`node server\.ts`/],
  ])
})

test('[03-5] the pages say what the second pass of the docs site looked for: how a search ranks, what a proxy is taken as, what is counted behind one, the state a component reads, and a move from code', () => {
  says([
    ['option.table.search', /bm25/],
    ['option.table.search', /every column weighs the same/],
    ['command.start', /`scheme=https`/],
    ['code.F0005', /`screensPerMinute`/],
    ['code.F0005', /`X-Forwarded-For`/],
    ['command.export', /`X-Forwarded-For`/],
    ['option.project.state', /set\(\{ mode/],
    ['hook.useGoTo', /moves inside the page/],
  ])
  assert.doesNotMatch(pageOf('hook.useGoTo'), /loaded as a whole page/)
})

test('[03-5] the pages say what the builder of the engine of sample app 5 looked for: what a driver is handed, whose call it makes, what it keeps of the agent, what a page shows of it, a limit a person sets, and the names a definition may not take', () => {
  says([
    ['adapter.Driver', /`waitFor`/],
    ['adapter.Driver', /`used\(/],
    ['adapter.Driver', /`allow\(/],
    ['adapter.Driver', /as the starter of the run/],
    ['adapter.Driver', /`run\.record`/],
    ['option.agent.questions', /`adapter\.Driver`/],
    ['option.agent.memory', /`adapter\.Driver`/],
    ['hook.useAgent', /env\.tell\(/],
    ['option.model.limits', /`shows: 'counts'`/],
    ['word.project', /`code\.F1004`/],
    ['word.service', /`code\.F1009`/],
    ['topic.words', /`mail`, `files`/],
  ])
})
