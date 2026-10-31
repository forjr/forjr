// The share a node keeps of its start at each round, and how many rounds the walk takes.
const kept = 0.15
const rounds = 50

/**
 * Takes the nodes in the order that breaks a tie, the edges as pairs `[from, to]`, and the nodes that are doors.
 * Answers each node with its weight, the heaviest first, nodes of one weight in the order they were handed: the
 * share of a walk that starts at a door and follows the edges out, as Aider weighs the files of a repository.
 */
export function weighed(o: { nodes: string[]; edges: [string, string][]; doors: string[] }): {
  name: string
  weight: number
}[] {
  const known = new Set(o.nodes)
  const doors = [...new Set(o.doors.filter((one) => known.has(one)))]
  const starts = doors.length ? doors : o.nodes
  const start = new Map(o.nodes.map((one) => [one, 0]))
  for (const one of starts) start.set(one, 1 / starts.length)
  // Each node's edges out, each node it leads to once however many edges or kinds lead there.
  const leads = new Map<string, Set<string>>(o.nodes.map((one) => [one, new Set()]))
  for (const [from, to] of o.edges) if (known.has(from) && known.has(to)) leads.get(from)?.add(to)
  let share = new Map(start)
  for (let round = 0; round < rounds; round++) {
    const next = new Map(o.nodes.map((one) => [one, kept * (start.get(one) ?? 0)]))
    let back = 0
    for (const one of o.nodes) {
      const handed = (1 - kept) * (share.get(one) ?? 0)
      const to = leads.get(one) ?? new Set<string>()
      if (!to.size) back += handed
      else for (const target of to) next.set(target, (next.get(target) ?? 0) + handed / to.size)
    }
    // What a node with no edge out hands on goes back to the start, shared as the start is.
    for (const one of starts) next.set(one, (next.get(one) ?? 0) + back / starts.length)
    share = next
  }
  const weights = o.nodes.map((name) => ({ name, weight: Math.round((share.get(name) ?? 0) * 1e12) / 1e12 }))
  return weights
    .map((one, at) => ({ ...one, at }))
    .sort((a, b) => b.weight - a.weight || a.at - b.at)
    .map(({ name, weight }) => ({ name, weight }))
}
