import { inner } from 'forjr/core'
import type { data } from '../data/index.ts'

export type Data = typeof data
export type Late = typeof import('../data/index.ts')
export const engine = inner
export const later = () => import('../core/index.ts')
