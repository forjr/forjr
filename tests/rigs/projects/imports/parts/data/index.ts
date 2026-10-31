import { existsSync } from 'node:fs'
import { inner } from '../core/index.ts'
import { pack } from './borrowed/wrapper.ts'

export const data = existsSync('data') ? inner : pack
