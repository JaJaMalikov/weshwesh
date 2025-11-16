import { create } from 'zustand'

const eventEmitter = {
  listeners: {},
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  },
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(
        (listener) => listener !== callback
      );
    }
  },
  emit(event, ...args) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((listener) => listener(...args));
    }
  },
};

const useUIStore = create((set, get) => ({
  activePanel: null,
  timelineOpen: true,
  sceneBackground: null,
  // resetCanvasView: null, // REMOVED

  setActivePanel: (panelId) => set({ activePanel: panelId }),
  togglePanel: (panelId) =>
    set((state) => ({
      activePanel: state.activePanel === panelId ? null : panelId,
    })),
  closePanel: () => set({ activePanel: null }),
  toggleTimeline: () =>
    set((state) => ({ timelineOpen: !state.timelineOpen })),
  setTimelineOpen: (open) => set({ timelineOpen: Boolean(open) }),
  setSceneBackground: (background) => set({ sceneBackground: background }),
  clearSceneBackground: () => set({ sceneBackground: null }),
  // registerCanvasReset: (callback) => set({ resetCanvasView: callback }), // REMOVED

  on: eventEmitter.on.bind(eventEmitter),
  off: eventEmitter.off.bind(eventEmitter),
  emit: eventEmitter.emit.bind(eventEmitter),

  fitSceneInView: () => {
    get().emit('resetCanvasView'); // Emit the event
    if (get().activePanel === 'library') {
      set({ activePanel: null });
    }
  },
}))

export default useUIStore
