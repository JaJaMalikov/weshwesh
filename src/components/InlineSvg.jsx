import { useEffect, useState, useMemo } from 'react'

function InlineSvg({ src }) {
  const [svgContent, setSvgContent] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!src) return
    let cancelled = false
    setStatus('loading')
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
    // Remove width/height and add viewbox if missing, to allow scaling
    return svgContent
      .replace(/width="[^"]+"/, 'width="100%"')
      .replace(/height="[^"]+"/, 'height="100%"')
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
