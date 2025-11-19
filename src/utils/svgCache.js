const svgTextCache = new Map()

function normalizeSrc(src) {
  if (!src) return null
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src
  }
  return `/assets/${src}`
}

export async function fetchSvgText(rawSrc) {
  const src = normalizeSrc(rawSrc)
  if (!src) {
    return null
  }

  const cachedValue = svgTextCache.get(src)
  if (cachedValue) {
    return Promise.resolve(cachedValue)
  }

  const fetchPromise = fetch(src).then((response) => {
    if (!response.ok) {
      throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`)
    }
    return response.text()
  })

  svgTextCache.set(src, fetchPromise)

  try {
    const text = await fetchPromise
    svgTextCache.set(src, text)
    return text
  } catch (error) {
    svgTextCache.delete(src)
    throw error
  }
}

export function clearSvgCache(rawSrc) {
  const src = normalizeSrc(rawSrc)
  if (!src) return
  svgTextCache.delete(src)
}
