import { useEffect, useState, useMemo } from 'react'

function InlineSvg({ src }) {
  const [svgContent, setSvgContent] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!src) return
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        setStatus('loading')
      }
    })
    fetch(src)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch SVG: ${res.statusText}`)
        }
        return res.text()
      })
      .then((text) => {
        if (!cancelled) {
          setSvgContent(text)
          setStatus('success')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [src])

  const processedSvg = useMemo(() => {
    if (!svgContent) return null
    try {
      if (typeof DOMParser === 'undefined') {
        return svgContent
      }
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svgElement = doc.querySelector('svg')
      if (!svgElement) {
        return svgContent
      }

      const widthAttr = svgElement.getAttribute('width')
      const heightAttr = svgElement.getAttribute('height')

      svgElement.setAttribute('width', '100%')
      svgElement.setAttribute('height', '100%')

      if (!svgElement.hasAttribute('viewBox') && widthAttr && heightAttr) {
        const width = parseFloat(widthAttr)
        const height = parseFloat(heightAttr)
        if (Number.isFinite(width) && Number.isFinite(height)) {
          svgElement.setAttribute('viewBox', `0 0 ${width} ${height}`)
        }
      }

      return new XMLSerializer().serializeToString(svgElement)
    } catch (error) {
      console.error('InlineSvg: unable to normalize SVG dimensions', error)
      return svgContent
    }
  }, [svgContent])

  if (status === 'loading') {
    return <div>...</div>
  }

  if (status === 'error') {
    return <div>⚠️</div>
  }

  return <div dangerouslySetInnerHTML={{ __html: processedSvg }} />
}

export default InlineSvg
