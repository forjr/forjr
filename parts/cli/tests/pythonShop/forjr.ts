import { project } from 'forjr'

export const pyshop = project('pyshop', { title: 'Py shop', python: { version: '3.15', build: ['sdistonly'] } })
