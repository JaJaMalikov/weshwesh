import { useCallback, useMemo } from 'react'
import Sidebar from './components/layout/Sidebar'
import CanvasArea from './components/layout/CanvasArea'
import TimelinePanel from './components/panels/TimelinePanel'
import { PANEL_CONFIG_MAP } from './config/panels'
import useShortcuts from './hooks/useShortcuts'
import useUIStore from './stores/useUIStore'
import useSceneStore from './stores/useSceneStore'
import { useShallow } from 'zustand/react/shallow'
import './App.css'

function App() {
  const {
    activePanel,
    timelineOpen,
    togglePanel,
    closePanel,
    toggleTimeline,
    setTimelineOpen,
  } = useUIStore(
    useShallow((state) => ({
      activePanel: state.activePanel,
      timelineOpen: state.timelineOpen,
      togglePanel: state.togglePanel,
      closePanel: state.closePanel,
      toggleTimeline: state.toggleTimeline,
      setTimelineOpen: state.setTimelineOpen,
    })),
  )
  const { removeObject, selectedObjectId } = useSceneStore(
    useShallow((state) => ({
      removeObject: state.removeObject,
      selectedObjectId: state.selectedObjectId,
    })),
  )
  const activePanelConfig = activePanel
    ? PANEL_CONFIG_MAP[activePanel]
    : null
  const ActivePanelComponent = activePanelConfig?.Component

  const deleteSelectedObject = useCallback(() => {
    if (selectedObjectId) {
      removeObject(selectedObjectId)
    }
  }, [removeObject, selectedObjectId])

  const shortcutHandlers = useMemo(() => {
    const { undo, redo } = useSceneStore.temporal.getState()
    return {
      library: () => togglePanel('library'),
      inspector: () => togglePanel('inspector'),
      layers: () => togglePanel('layers'),
      toggleTimeline: () => toggleTimeline(),
      fitView: () => useUIStore.getState().fitSceneInView?.(),
      closePanel: () => closePanel(),
      deleteObject: deleteSelectedObject,
      deleteObjectAlt: deleteSelectedObject,
      undo: () => undo(),
      redo: () => redo(),
      redoAlt: () => redo(),
    }
  }, [
    deleteSelectedObject,
    closePanel,
    togglePanel,
    toggleTimeline,
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
