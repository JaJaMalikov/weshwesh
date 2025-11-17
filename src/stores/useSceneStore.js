import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { persist } from 'zustand/middleware'
import { temporal } from 'zundo'

const useSceneStore = create(
  persist(
    temporal(
      (set, get) => ({
        objects: [],
        selectedObjectId: null,

        addObject: (asset) => {
          const { objects } = get()
          const highestZIndex = objects.reduce(
            (max, obj) => Math.max(max, obj.zIndex ?? 0),
            0
          )
          const nextZIndex = highestZIndex + 1
          const uniqueId = nanoid()

          // Clone asset and remove its 'id' field to avoid conflicts
          const clonedAsset = structuredClone(asset)
          const { id: _assetId, ...assetWithoutId } = clonedAsset

          const newObject = {
            ...assetWithoutId, // Spread asset properties first (name, category, etc.)
            id: uniqueId, // Then override with unique ID
            pantinDefId: _assetId, // Store original pantin definition ID if it exists
            assetId: asset.path, // Using asset path as a reference to the asset
            type: asset.category,
            x: 0,
            y: 0,
            zIndex: nextZIndex,
            visible: true,
            rotation: 0,
            scale: 1,
            parentObjectId: null, // ID of parent object (pantin)
            parentMemberId: null, // ID of parent member within the pantin
            relativeX: null, // Position relative to parent pantin
            relativeY: null,
            relativeRotation: null,
          }
          set({
            objects: [...objects, newObject],
            selectedObjectId: newObject.id, // Select the new object
          })
        },

        toggleObjectVisibility: (id) => {
          set((state) => ({
            objects: state.objects.map((obj) =>
              obj.id === id ? { ...obj, visible: !obj.visible } : obj
            ),
          }))
        },

        removeObject: (id) => {
          set((state) => ({
            objects: state.objects.filter((obj) => obj.id !== id),
            selectedObjectId:
              state.selectedObjectId === id ? null : state.selectedObjectId,
          }))
        },

        updateObject: (id, newProps) => {
          set((state) => ({
            objects: state.objects.map((obj) =>
              obj.id === id ? { ...obj, ...newProps } : obj
            ),
          }));
        },

        selectObject: (id) => {
          set({ selectedObjectId: id })
        },

        reorderObjects: (newOrder) => {
          const { objects } = get()
          const orderedObjects = newOrder
            .map((id) => objects.find((obj) => obj.id === id))
            .filter(Boolean) // Filter out any potential mismatches
            .map((obj, index) => ({ ...obj, zIndex: index + 1 }))

          set({ objects: orderedObjects })
        },

        moveObjectUp: (id) => {
          set((state) => {
            const objects = [...state.objects].sort(
              (a, b) => a.zIndex - b.zIndex
            )
            const currentIndex = objects.findIndex((obj) => obj.id === id)
            if (currentIndex < 0 || currentIndex === objects.length - 1) {
              return {} // Not found or already at the top
            }
            const targetObject = objects[currentIndex]
            const swapObject = objects[currentIndex + 1]
            // Swap z-indexes
            const newObjects = state.objects.map((obj) => {
              if (obj.id === targetObject.id)
                return { ...obj, zIndex: swapObject.zIndex }
              if (obj.id === swapObject.id)
                return { ...obj, zIndex: targetObject.zIndex }
              return obj
            })
            return { objects: newObjects }
          })
        },

        moveObjectDown: (id) => {
          set((state) => {
            const objects = [...state.objects].sort(
              (a, b) => a.zIndex - b.zIndex
            )
            const currentIndex = objects.findIndex((obj) => obj.id === id)
            if (currentIndex <= 0) {
              return {} // Not found or already at the bottom
            }
            const targetObject = objects[currentIndex]
            const swapObject = objects[currentIndex - 1]
            // Swap z-indexes
            const newObjects = state.objects.map((obj) => {
              if (obj.id === targetObject.id)
                return { ...obj, zIndex: swapObject.zIndex }
              if (obj.id === swapObject.id)
                return { ...obj, zIndex: targetObject.zIndex }
              return obj
            })
            return { objects: newObjects }
          })
        },
      }),
      {
        // Exclude selectedObjectId from being part of the undo/redo history
        partialize: (state) => {
          const { selectedObjectId: _selectedObjectId, ...rest } = state
          return rest
        },
      }
    ),
    {
      name: 'bab-scene-storage', // name of the item in the storage (must be unique)
      version: 1,
      migrate: (persistedState, version) => {
        // Migration: Fix objects with non-unique IDs (e.g., id: "manu")
        if (persistedState && persistedState.objects) {
          persistedState.objects = persistedState.objects.map((obj) => {
            // Check if the ID looks like a pantin definition ID (short, no special chars)
            // instead of a nanoid (which has hyphens and is longer)
            if (obj.id && obj.id.length < 10 && !obj.id.includes('-')) {
              // This is likely a pantin definition ID, regenerate a unique ID
              return {
                ...obj,
                pantinDefId: obj.id, // Save the original ID
                id: nanoid(), // Generate a new unique ID
              }
            }
            return obj
          })
        }
        return persistedState
      },
    }
  )
)

export default useSceneStore
