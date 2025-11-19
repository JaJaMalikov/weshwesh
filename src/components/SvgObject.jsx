import { useEffect, useState } from 'react'
import { fetchSvgText } from '../utils/svgCache'

function SvgObject({ src, x, y, rotation, scale, onPointerDown, className }) {
  const [svgContent, setSvgContent] = useState(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false

    fetchSvgText(src)
      .then((text) => {
        if (cancelled || !text) {
          return
        }

        const parser = new DOMParser()
        const doc = parser.parseFromString(text, 'image/svg+xml')
        const svgElement = doc.querySelector('svg')

        if (!svgElement) {
          return
        }

        const viewBox = svgElement.getAttribute('viewBox')
        const width = svgElement.getAttribute('width')
        const height = svgElement.getAttribute('height')

        const innerHTML = svgElement.innerHTML

        setSvgContent({
          innerHTML,
          viewBox,
          width,
          height,
        })
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load SVG:', err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (!svgContent) {
    return null
  }

  const width = parseFloat(svgContent.width) || 100
  const height = parseFloat(svgContent.height) || 100

  return (
    <svg
      className={className}
      x={x}
      y={y}
      width={width * scale}
      height={height * scale}
      viewBox={svgContent.viewBox || `0 0 ${width} ${height}`}
      transform={`rotate(${rotation} ${x + (width * scale) / 2} ${y + (height * scale) / 2})`}
      onPointerDown={onPointerDown}
      style={{ cursor: 'grab', overflow: 'visible' }}
      shapeRendering="geometricPrecision"
    >
      <g dangerouslySetInnerHTML={{ __html: svgContent.innerHTML }} />
    </svg>
  )
}

export default SvgObject
