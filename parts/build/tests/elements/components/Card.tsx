import { component, text } from 'forjr/ui'

export const Card = component('Card', {
  props: { title: text({ default: 'Untitled' }) },
  view: ({ title, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 16, background: '#ffffff' }}>
      <span>{title}</span>
      {children}
    </div>
  ),
})
