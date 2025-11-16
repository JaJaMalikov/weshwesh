import { useEffect, useState } from 'react'

function SvgBackground({ src, width, height }) {
  const [svgContent, setSvgContent] = useState(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false

    // Check if it's an SVG or image file
    const isSvg = src.endsWith('.svg')

    if (!isSvg) {
      // For PNG/JPG backgrounds, use image element
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSvgContent({ type: 'image', src })
        }
      })
      return
    }

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch background: ${res.statusText}`)
        return res.text()
      })
      .then((text) => {
        if (!cancelled) {
          const parser = new DOMParser()
          const doc = parser.parseFromString(text, 'image/svg+xml')
          const svgElement = doc.querySelector('svg')

          if (svgElement) {
            const innerHTML = svgElement.innerHTML
            setSvgContent({ type: 'svg', innerHTML })
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load background:', err)
        }
      })

    return () => {
      cancelled = true
    }
  }, [src])

  if (!svgContent) {
    return null
  }

  if (svgContent.type === 'image') {
    return (
      <image
        href={svgContent.src}
        width={width}
        height={height}
        preserveAspectRatio="none"
      />
    )
  }

  return (
    <g dangerouslySetInnerHTML={{ __html: svgContent.innerHTML }} />
  )
}

export default SvgBackground
