import { useEffect, useMemo, useState } from 'react'
import useUIStore from '../../stores/useUIStore'
import useSceneStore from '../../stores/useSceneStore'

const MANIFEST_URL = '/assets/assets-manifest.json'

function LibraryPanel() {
  const [assets, setAssets] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [activeCategory, setActiveCategory] = useState(null)
  const sceneBackground = useUIStore((state) => state.sceneBackground)
  const setSceneBackground = useUIStore((state) => state.setSceneBackground)
  const addObject = useSceneStore((state) => state.addObject)

  const handleDoubleClick = async (asset) => {
    if (asset.category === 'pantins') {
      try {
        const res = await fetch(`/assets/${asset.meta}`)
        if (!res.ok) throw new Error('Failed to fetch pantin data')
        const data = await res.json()

        // Get scene background dimensions to center the object
        const background = useUIStore.getState().sceneBackground
        const centerX = background ? (background.width - data.width) / 2 : 0
        const centerY = background ? (background.height - data.height) / 2 : 0

        // Initialize rotation for each member
        const membersWithRotation = data.members.map(member => ({
          ...member,
          rotation: member.rotation || 0
        }))

        // Ensure 'path' field is preserved for rendering
        // The JSON data uses 'source' but we need 'path' for consistent rendering
        addObject({
          ...asset,
          ...data, // The JSON data includes width, height, members, etc.
          members: membersWithRotation, // Use members with rotation initialized
          ...asset, // Spread asset after to preserve path, name, category
          path: data.source || asset.path, // Explicitly set path from source
          x: centerX,
          y: centerY,
        })
      } catch (err) {
        console.error(err)
        // Handle error, maybe show a toast
      }
    } else if (asset.category === 'objets') {
      // Preload to get dimensions for SVGs
      const img = new Image()
      img.onload = () => {
        // Get scene background dimensions to center the object
        const background = useUIStore.getState().sceneBackground
        const centerX = background ? (background.width - img.naturalWidth) / 2 : 0
        const centerY = background ? (background.height - img.naturalHeight) / 2 : 0

        addObject({
          ...asset,
          width: img.naturalWidth,
          height: img.naturalHeight,
          x: centerX,
          y: centerY,
        })
      }
      img.onerror = () => {
        console.error('Failed to load image for dimensions')
      }
      img.src = `/assets/${asset.path}`
    }
  }

  useEffect(() => {
    let cancelled = false
    const fetchManifest = async () => {
      setStatus('loading')
      try {
        const response = await fetch(MANIFEST_URL)
        if (!response.ok) {
          throw new Error('Impossible de charger la bibliothèque')
        }
        const payload = await response.json()
        if (cancelled) return
        setAssets(payload)
        setActiveCategory((prev) => prev || payload[0]?.category || null)
        setStatus('success')
      } catch (err) {
        if (cancelled) return
        setError(err.message)
        setStatus('error')
      }
    }

    fetchManifest()
    return () => {
      cancelled = true
    }
  }, [])

  const assetsByCategory = useMemo(() => {
    return assets.reduce((acc, asset) => {
      if (!acc[asset.category]) {
        acc[asset.category] = []
      }
      acc[asset.category].push(asset)
      return acc
    }, {})
  }, [assets])

  const categories = useMemo(
    () => Object.keys(assetsByCategory),
    [assetsByCategory]
  )

  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(categories[0])
    }
  }, [activeCategory, categories])

  const persistBackground = (asset, width, height) => {
    setSceneBackground({
      name: asset.name,
      path: asset.path,
      width,
      height,
    })
  }

  const preloadImage = (asset) => {
    const assetUrl = `/assets/${asset.path}`
    const img = new Image()
    img.onload = () => {
      persistBackground(asset, img.naturalWidth, img.naturalHeight)
    }
    img.src = assetUrl
  }

  const handleAssetSelect = (asset, imgElement) => {
    if (asset.category !== 'decors') {
      return
    }

    const width = imgElement?.naturalWidth
    const height = imgElement?.naturalHeight

    if (width && height) {
      persistBackground(asset, width, height)
    } else {
      preloadImage(asset)
    }
  }



  if (status === 'loading') {
    return <p>Chargement de la bibliothèque...</p>
  }

  if (status === 'error') {
    return <p className="library-error">{error}</p>
  }

  if (!categories.length) {
    return <p>Aucun asset disponible pour le moment.</p>
  }

  return (
    <div className="library-panel">
      <div className="library-tabs" role="tablist">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            className={`library-tab ${
              category === activeCategory ? 'active' : ''
            }`}
            onClick={() => setActiveCategory(category)}
            role="tab"
            aria-selected={category === activeCategory}
          >
            {category}
          </button>
        ))}
      </div>

      <ul className="library-items">
        {assetsByCategory[activeCategory]?.map((asset) => {
          const isDecor = asset.category === 'decors'
          const isActive = sceneBackground?.path === asset.path

          return (
            <li
              key={`${asset.category}-${asset.name}`}
              className={`library-item ${isActive ? 'active' : ''}`}
              onDoubleClick={() => handleDoubleClick(asset)}
            >
              <figure>
                {isDecor ? (
                  <button
                    type="button"
                    onClick={(event) =>
                      handleAssetSelect(asset, event.currentTarget.querySelector('img'))
                    }
                    aria-label={asset.name}
                    style={{ background: 'none', border: 'none', padding: 0 }}
                  >
                    <img
                      src={`/assets/${asset.path}`}
                      alt={asset.name}
                      title={asset.name}
                      loading="lazy"
                      className="decor-tile"
                    />
                  </button>
                ) : (
                  <img
                    src={`/assets/${asset.path}`}
                    alt={asset.name}
                    title={asset.name}
                    loading="lazy"
                  />
                )}
              </figure>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default LibraryPanel
