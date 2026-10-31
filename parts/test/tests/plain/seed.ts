import { seed } from 'forjr'
import { orders } from './forjr'

export default seed([orders.add({ name: 'Ann', total: 5 })])
