import React, { useMemo, useState } from 'react'
import { Eye, EyeOff, ArrowUp, ArrowDown } from 'lucide-react'
import useSceneStore from '../../stores/useSceneStore'

function LayersPanel() {
  const objects = useSceneStore((state) => state.objects)
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId)
  const selectObject = useSceneStore((state) => state.selectObject)
  const reorderObjects = useSceneStore((state) => state.reorderObjects)
  const toggleObjectVisibility = useSceneStore(
    (state) => state.toggleObjectVisibility
  )
  const moveObjectUp = useSceneStore((state) => state.moveObjectUp)
  const moveObjectDown = useSceneStore((state) => state.moveObjectDown)

  const [draggedId, setDraggedId] = useState(null)
  const [dropTargetId, setDropTargetId] = useState(null)

  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => b.zIndex - a.zIndex),
    [objects]
  )

  const handleDragStart = (event, id) => {
    setDraggedId(id)
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
    document.body.classList.add('is-dragging-layer')
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDropTargetId(null)
    document.body.classList.remove('is-dragging-layer')
  }

  const handleDragOver = (event, targetId) => {
    event.preventDefault()
    if (targetId !== dropTargetId) {
      setDropTargetId(targetId)
    }
  }

  const handleDragLeave = () => {
    setDropTargetId(null)
  }

  const handleDrop = (event, targetId) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    handleDragEnd() // Clean up

    if (sourceId === targetId) return

    const currentIds = sortedObjects.map((o) => o.id)
    const sourceIndex = currentIds.indexOf(sourceId)
    const targetIndex = currentIds.indexOf(targetId)

    currentIds.splice(sourceIndex, 1)
    currentIds.splice(targetIndex, 0, sourceId)

    const newOrder = currentIds.reverse()
    reorderObjects(newOrder)
  }

  if (sortedObjects.length === 0) {
    return <p>Aucun objet sur la scène.</p>
  }

  return (
    <ol onDragLeave={handleDragLeave}>
      {sortedObjects.map((obj, index) => {
        const isFirst = index === 0
        const isLast = index === sortedObjects.length - 1

        return (
          <React.Fragment key={obj.id}>
            {dropTargetId === obj.id && (
              <li className="drop-indicator" key={`${obj.id}-drop`} />
            )}
            <li
              className={`layer-item ${
                obj.id === selectedObjectId ? 'selected' : ''
              } ${obj.id === draggedId ? 'dragging' : ''}`}
              onClick={() => selectObject(obj.id)}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, obj.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, obj.id)}
              onDrop={(e) => handleDrop(e, obj.id)}
            >
              <button
                type="button"
                className="layer-visibility-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleObjectVisibility(obj.id)
                }}
              >
                {obj.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <span className="layer-name">{obj.name}</span>
              <div className="layer-actions">
                <button
                  type="button"
                  className="layer-action-btn"
                  disabled={isFirst}
                  onClick={(e) => {
                    e.stopPropagation()
                    moveObjectUp(obj.id)
                  }}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  className="layer-action-btn"
                  disabled={isLast}
                  onClick={(e) => {
                    e.stopPropagation()
                    moveObjectDown(obj.id)
                  }}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </li>
          </React.Fragment>
        )
      })}
    </ol>
  )
}

export default LayersPanel
