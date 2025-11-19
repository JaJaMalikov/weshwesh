import { useEffect, useState, useMemo } from 'react'
import { fetchSvgText } from '../utils/svgCache'

function InlineSvg({ src, className, style, ...rest }) {
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
    fetchSvgText(src)
      .then((text) => {
        if (!cancelled && text) {
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
        return null
      }
      const parser = new DOMParser()
      const doc = parser.parseFromString(svgContent, 'image/svg+xml')
      const svgElement = doc.querySelector('svg')
      if (!svgElement) {
        return null
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

      const attributes = {}
      Array.from(svgElement.attributes).forEach((attr) => {
        if (attr.name === 'class' || attr.name === 'style') {
          return
        }
        attributes[attr.name] = attr.value
      })

      return {
        attributes,
        innerHTML: svgElement.innerHTML,
      }
    } catch (error) {
      console.error('InlineSvg: unable to normalize SVG dimensions', error)
      return null
    }
  }, [svgContent])

  if (status === 'loading') {
    return (
      <span className={className} style={style} {...rest}>
        …
      </span>
    )
  }

  if (status === 'error' || !processedSvg) {
    return (
      <span className={className} style={style} {...rest}>
        ⚠️
      </span>
    )
  }

  return (
    <svg
      {...processedSvg.attributes}
      className={className}
      style={style}
      {...rest}
      dangerouslySetInnerHTML={{ __html: processedSvg.innerHTML }}
    />
  )
}

export default InlineSvg
