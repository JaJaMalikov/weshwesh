import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useUIStore from '../../stores/useUIStore'
import useSceneStore from '../../stores/useSceneStore'
import InlineSvg from '../InlineSvg'

const MIN_SCALE = 0.25
const MAX_SCALE = 4

function CanvasArea() {
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

  // Memoized Calculations
  const sceneDimensions = useMemo(() => {
    if (!sceneBackground?.width || !sceneBackground?.height) return null
    return { width: sceneBackground.width, height: sceneBackground.height }
  }, [sceneBackground])

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

  const handlePanEnd = useCallback(() => {
    panStateRef.current = null
    setIsPanning(false)
    window.removeEventListener('pointermove', handlePan)
    window.removeEventListener('pointerup', handlePanEnd)
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
      updateObject(object.id, { x: initialX + dx, y: initialY + dy })
    },
    [fitScale, transform.scale, updateObject]
  )

  const handleObjectDragEnd = useCallback(() => {
    draggedObjectRef.current = null
    window.removeEventListener('pointermove', handleObjectDrag)
    window.removeEventListener('pointerup', handleObjectDragEnd)
  }, [handleObjectDrag])

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

  // --- Render ---

  return (
    <div className="canvas-area" ref={containerRef}>
      {sceneBackground && sceneDimensions && fitScale ? (
        <div
          ref={stageRef}
          className={`canvas-stage ${isPanning ? 'is-dragging' : ''}`}
          style={{
            width: sceneDimensions.width,
            height: sceneDimensions.height,
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${
              fitScale * transform.scale
            })`,
          }}
          onPointerDown={handlePanStart}
          onDoubleClick={resetView}
          onDragOver={(e) => e.preventDefault()}
        >
          <img
            src={`/assets/${sceneBackground.path}`}
            alt={sceneBackground.name}
            loading="eager"
            draggable="false"
            style={{ zIndex: 0 }}
          />
          {objects
            .filter((obj) => obj.visible)
            .map((obj) => {
              const isSelected = obj.id === selectedObjectId
              return (
                <div
                  key={obj.id}
                  className={`scene-object ${isSelected ? 'selected' : ''}`}
                  style={{
                    width: obj.width,
                    height: obj.height,
                    transform: `translate(${obj.x}px, ${obj.y}px) rotate(${obj.rotation}deg) scale(${obj.scale})`,
                    zIndex: obj.zIndex,
                  }}
                  onPointerDown={(e) => handleObjectPointerDown(e, obj)}
                >
                  <InlineSvg src={`/assets/${obj.path}`} />
                </div>
              )
            })}
        </div>
      ) : (
        <div className="canvas-placeholder">
          <p>Canvas SVG</p>
          <span>Le théâtre numérique arrive ici.</span>
        </div>
      )}
    </div>
  )
}

export default CanvasArea