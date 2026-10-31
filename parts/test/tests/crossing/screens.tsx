import { screen } from 'forjr/ui'

Reflect.set(globalThis, 'crossingLoaded', [...(Reflect.get(globalThis, 'crossingLoaded') ?? []), import.meta.url])

export const homeScreen = screen('homeScreen', {
  path: '/',
  access: 'anyone',
  title: 'Home',
  view: () => <h1>The crossing</h1>,
})
