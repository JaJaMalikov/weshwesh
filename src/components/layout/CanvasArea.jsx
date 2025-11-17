import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useUIStore from '../../stores/useUIStore'
import useSceneStore from '../../stores/useSceneStore'
import SvgObject from '../SvgObject'
import SvgBackground from '../SvgBackground'
import Pantin from '../Pantin'

const MIN_SCALE = 0.25
const MAX_SCALE = 4

function CanvasArea({ panelContent }) {
  // Store Selectors
  const sceneBackground = useUIStore((state) => state.sceneBackground)
  const onStoreEvent = useUIStore((state) => state.on)
  const offStoreEvent = useUIStore((state) => state.off)
  const objects = useSceneStore((state) => state.objects)
  const selectedObjectId = useSceneStore((state) => state.selectedObjectId)
  const selectObject = useSceneStore((state) => state.selectObject)
  const updateObject = useSceneStore((state) => state.updateObject)

  // Component State & Refs
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStateRef = useRef(null)
  const draggedObjectRef = useRef(null)
  const [tempObjectPositions, setTempObjectPositions] = useState({})

  // Memoized Calculations
  const sceneDimensions = useMemo(() => {
    if (!sceneBackground?.width || !sceneBackground?.height) return null
    return { width: sceneBackground.width, height: sceneBackground.height }
  }, [sceneBackground])

  // Merge objects with temporary drag positions
  const displayObjects = useMemo(() => {
    return objects.map(obj => {
      const tempPos = tempObjectPositions[obj.id]
      return tempPos ? { ...obj, ...tempPos } : obj
    })
  }, [objects, tempObjectPositions])

  const fitScale = useMemo(() => {
    if (!sceneDimensions || !viewport.width || !viewport.height) return 1
    return Math.min(
      viewport.width / sceneDimensions.width,
      viewport.height / sceneDimensions.height
    )
  }, [sceneDimensions, viewport])

  // Callbacks & Handlers
  const resetView = useCallback(() => {
    setTransform({ scale: 1, x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback(
    (event) => {
      if (!event.ctrlKey || !sceneDimensions) return
      event.preventDefault()
      event.stopPropagation()
      const zoomDirection = event.deltaY > 0 ? -1 : 1
      const zoomFactor = 1 + zoomDirection * 0.1
      setTransform((prev) => {
        const currentEffectiveScale = prev.scale * fitScale
        const nextEffectiveScale = Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, currentEffectiveScale * zoomFactor)
        )
        const nextScale = nextEffectiveScale / fitScale
        return { ...prev, scale: nextScale }
      })
    },
    [sceneDimensions, fitScale]
  )

  const handlePan = useCallback((event) => {
    if (!panStateRef.current) return
    event.preventDefault()
    const { startX, startY, originX, originY } = panStateRef.current
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    setTransform((prev) => ({ ...prev, x: originX + dx, y: originY + dy }))
  }, [])

  const handlePanEnd = useCallback(function onPanEnd() {
    panStateRef.current = null
    setIsPanning(false)
    window.removeEventListener('pointermove', handlePan)
    window.removeEventListener('pointerup', onPanEnd)
  }, [handlePan])

  const handlePanStart = useCallback(
    (event) => {
      selectObject(null)
      if (!event.ctrlKey || event.button !== 0) return
      event.preventDefault()
      event.stopPropagation()
      panStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: transform.x,
        originY: transform.y,
      }
      setIsPanning(true)
      window.addEventListener('pointermove', handlePan)
      window.addEventListener('pointerup', handlePanEnd)
    },
    [transform.x, transform.y, selectObject, handlePan, handlePanEnd]
  )

  const handleObjectDrag = useCallback(
    (event) => {
      if (!draggedObjectRef.current) return
      const { initialX, initialY, pointerX, pointerY, object } =
        draggedObjectRef.current
      const sceneScale = fitScale * transform.scale
      const dx = (event.clientX - pointerX) / sceneScale
      const dy = (event.clientY - pointerY) / sceneScale
      const finalX = initialX + dx
      const finalY = initialY + dy

      // Store final position in ref for handleObjectDragEnd
      draggedObjectRef.current.finalX = finalX
      draggedObjectRef.current.finalY = finalY

      // Update temporary position during drag (no store update = no lag)
      setTempObjectPositions(prev => ({
        ...prev,
        [object.id]: { x: finalX, y: finalY }
      }))
    },
    [fitScale, transform.scale]
  )

  const handleObjectDragEnd = useCallback(function onObjectDragEnd() {
    const dragged = draggedObjectRef.current
    if (dragged && dragged.finalX !== undefined && dragged.finalY !== undefined) {
      // Apply final position to store (only once at the end)
      updateObject(dragged.object.id, { x: dragged.finalX, y: dragged.finalY })
      // Clear temporary position
      setTempObjectPositions(prev => {
        const newPos = { ...prev }
        delete newPos[dragged.object.id]
        return newPos
      })
    }
    draggedObjectRef.current = null
    window.removeEventListener('pointermove', handleObjectDrag)
    window.removeEventListener('pointerup', onObjectDragEnd)
  }, [handleObjectDrag, updateObject])

  const handleObjectPointerDown = useCallback(
    (event, object) => {
      if (event.button !== 0) return // Ignore right/middle clicks
      event.stopPropagation()
      selectObject(object.id)
      draggedObjectRef.current = {
        object,
        initialX: object.x,
        initialY: object.y,
        pointerX: event.clientX,
        pointerY: event.clientY,
      }
      window.addEventListener('pointermove', handleObjectDrag)
      window.addEventListener('pointerup', handleObjectDragEnd)
    },
    [handleObjectDrag, handleObjectDragEnd, selectObject]
  )

  // --- Effects ---

  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry?.contentRect) {
        setViewport({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setTransform({ scale: 1, x: 0, y: 0 })
  }, [sceneBackground?.path])

  useEffect(() => {
    const node = stageRef.current
    if (!node) return
    node.addEventListener('wheel', handleWheel, { passive: false })
    return () => node.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  useEffect(() => {
    onStoreEvent('resetCanvasView', resetView)
    return () => offStoreEvent('resetCanvasView', resetView)
  }, [onStoreEvent, offStoreEvent, resetView])

  const hasScene = Boolean(sceneBackground && sceneDimensions && fitScale)
  const stageScale = hasScene ? fitScale * transform.scale : 1

  // --- Render ---

  return (
    <div className="workspace-main">
      {panelContent}
      <div className="canvas-area" ref={containerRef}>
        {hasScene && (
          <svg
            ref={stageRef}
            className={`canvas-stage ${isPanning ? 'is-dragging' : ''}`}
            viewBox={`0 0 ${sceneDimensions.width} ${sceneDimensions.height}`}
            shapeRendering="geometricPrecision"
            style={{
              width: sceneDimensions.width,
              height: sceneDimensions.height,
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${stageScale})`,
              transformOrigin: 'center center',
            }}
            onPointerDown={handlePanStart}
            onDoubleClick={resetView}
            onDragOver={(e) => e.preventDefault()}
          >
            {/* Background as inline SVG */}
            <SvgBackground
              src={`/assets/${sceneBackground.path}`}
              width={sceneDimensions.width}
              height={sceneDimensions.height}
            />

            {/* Objects/Pantins sorted by zIndex - rendered as inline SVG */}
            {displayObjects
              .filter((obj) => obj.visible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map((obj) => {
                const isSelected = obj.id === selectedObjectId
                if (obj.category === 'pantins') {
                  return (
                    <Pantin
                      key={obj.id}
                      pantin={obj}
                      onPointerDown={(e) => handleObjectPointerDown(e, obj)}
                    />
                  )
                }
                return (
                  <SvgObject
                    key={obj.id}
                    src={`/assets/${obj.path}`}
                    x={obj.x}
                    y={obj.y}
                    rotation={obj.rotation}
                    scale={obj.scale}
                    className={`scene-object ${isSelected ? 'selected' : ''}`}
                    onPointerDown={(e) => handleObjectPointerDown(e, obj)}
                  />
                )
              })}
          </svg>
        )}
      </div>
    </div>
  )
}

export default CanvasArea
