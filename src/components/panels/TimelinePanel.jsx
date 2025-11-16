const DEFAULT_TIMELINE_ITEMS = [
  { label: '00:00', note: 'Intro' },
  { label: '00:04', note: 'Rig entrée' },
  { label: '00:12', note: 'Zoom caméra' },
]

function TimelinePanel({ items = DEFAULT_TIMELINE_ITEMS, onClose }) {
  if (!items.length) {
    return null
  }

  return (
    <section className="timeline-panel">
      <header>
        <button type="button" className="ghost-btn" onClick={onClose}>
          ✕
        </button>
      </header>
      <div className="timeline-track">
        {items.map((item) => (
          <div key={item.label} className="timeline-event">
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default TimelinePanel
