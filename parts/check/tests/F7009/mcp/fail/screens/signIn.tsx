import { screen } from 'forjr/ui'

export const signIn = screen('signIn', { path: '/sign-in', access: 'anyone', view: () => <span>Sign in</span> })
