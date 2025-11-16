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
          const newObject = {
            id: nanoid(),
            assetId: asset.path, // Using asset path as a reference to the asset
            type: asset.category,
            x: 0,
            y: 0,
            zIndex: objects.length + 1, // +1 because background is 0
            visible: true,
            rotation: 0,
            scale: 1,
            ...asset, // Spread asset properties like name, category, etc.
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
          }))
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
          const { selectedObjectId, ...rest } = state
          return rest
        },
      }
    ),
    {
      name: 'bab-scene-storage', // name of the item in the storage (must be unique)
    }
  )
)

export default useSceneStore
