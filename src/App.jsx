import { useMemo } from 'react'
import Sidebar from './components/layout/Sidebar'
import CanvasArea from './components/layout/CanvasArea'
import TimelinePanel from './components/panels/TimelinePanel'
import { PANEL_CONFIG_MAP } from './config/panels'
import useShortcuts from './hooks/useShortcuts'
import useUIStore from './stores/useUIStore'
import useSceneStore from './stores/useSceneStore'
import './App.css'

function App() {
  const activePanel = useUIStore((state) => state.activePanel)
  const timelineOpen = useUIStore((state) => state.timelineOpen)
  const setActivePanel = useUIStore((state) => state.setActivePanel)
  const togglePanel = useUIStore((state) => state.togglePanel)
  const closePanel = useUIStore((state) => state.closePanel)
  const toggleTimeline = useUIStore((state) => state.toggleTimeline)
  const setTimelineOpen = useUIStore((state) => state.setTimelineOpen)
  const removeObject = useSceneStore((state) => state.removeObject)
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId)
  const activePanelConfig = activePanel
    ? PANEL_CONFIG_MAP[activePanel]
    : null
  const ActivePanelComponent = activePanelConfig?.Component

  const shortcutHandlers = useMemo(() => {
    const { undo, redo } = useSceneStore.temporal.getState()
    return {
      library: () => setActivePanel('library'),
      inspector: () => setActivePanel('inspector'),
      layers: () => setActivePanel('layers'),
      toggleTimeline: () => toggleTimeline(),
      fitView: () => useUIStore.getState().fitSceneInView?.(),
      closePanel: () => closePanel(),
      deleteObject: () => {
        if (selectedObjectId) {
          removeObject(selectedObjectId)
        }
      },
      deleteObjectAlt: () => {
        if (selectedObjectId) {
          removeObject(selectedObjectId)
        }
      },
      undo: () => undo(),
      redo: () => redo(),
      redoAlt: () => redo(),
    }
  }, [
    closePanel,
    setActivePanel,
    toggleTimeline,
    selectedObjectId,
    removeObject,
  ])

  useShortcuts(shortcutHandlers)

  const handlePrimaryClick = (tool) => {
    if (tool.id === 'fit') {
      const store = useUIStore.getState()
      store.fitSceneInView?.()
      return
    }

    if (tool.id === 'timeline') {
      toggleTimeline()
      return
    }

    togglePanel(tool.id)
  }

  const panelContent =
    activePanelConfig && ActivePanelComponent ? (
      <section className="side-panel">
        <header>
          <h2>{activePanelConfig.title}</h2>
          <button type="button" className="ghost-btn" onClick={closePanel}>
            ✕
          </button>
        </header>
        <div className="panel-body">
          <ActivePanelComponent />
        </div>
      </section>
    ) : null

  return (
    <div className="app-shell">
      <Sidebar
        activePanel={activePanel}
        timelineOpen={timelineOpen}
        onPrimaryClick={handlePrimaryClick}
      />

      <div className="workspace">
        <CanvasArea panelContent={panelContent} />

        {timelineOpen && (
          <TimelinePanel onClose={() => setTimelineOpen(false)} />
        )}
      </div>
    </div>
  )
}

export default App
