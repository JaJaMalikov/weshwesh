import LibraryPanel from '../components/panels/LibraryPanel'
import InspectorPanel from '../components/panels/InspectorPanel'
import LayersPanel from '../components/panels/LayersPanel'

export const PANEL_CONFIGS = [
  { id: 'library', title: 'Library', Component: LibraryPanel },
  { id: 'inspector', title: 'Inspector', Component: InspectorPanel },
  { id: 'layers', title: 'Layers', Component: LayersPanel },
]

export const PANEL_CONFIG_MAP = PANEL_CONFIGS.reduce((acc, config) => {
  acc[config.id] = config
  return acc
}, {})
