import {
  BookMarked,
  Search,
  Layers,
  Clock,
  Maximize2,
  Save,
  FolderOpen,
  Keyboard,
} from 'lucide-react'

const PRIMARY_TOOLS = [
  { id: 'library', label: 'Library', icon: BookMarked },
  { id: 'inspector', label: 'Inspector', icon: Search },
  { id: 'layers', label: 'Layers', icon: Layers },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'fit', label: 'Fit in view', icon: Maximize2 },
]

const SECONDARY_TOOLS = [
  { id: 'save', label: 'Save', icon: Save },
  { id: 'open', label: 'Open', icon: FolderOpen },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
]

function Sidebar({ activePanel, timelineOpen, onPrimaryClick }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-group">
        {PRIMARY_TOOLS.map((tool) => {
          const Icon = tool.icon
          const isActive =
            activePanel === tool.id ||
            (tool.id === 'timeline' && timelineOpen)

          return (
            <button
              key={tool.id}
              type="button"
              className={`sidebar-btn ${isActive ? 'active' : ''}`}
              onClick={() => onPrimaryClick(tool)}
              aria-pressed={isActive}
              aria-label={tool.label}
            >
              <Icon />
            </button>
          )
        })}
      </div>
      <div className="sidebar-group">
        {SECONDARY_TOOLS.map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.id}
              type="button"
              className="sidebar-btn subtle"
              aria-label={tool.label}
            >
              <Icon />
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export default Sidebar
