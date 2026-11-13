import { create } from 'zustand'
import { DEFAULT_LOCATION } from '../services/marsLocations'

export const useMapStore = create((set) => ({
  selected: DEFAULT_LOCATION,
  focusTarget: null,
  detailsOpen: false,
  sheetSnap: 'peek',
  desktopDrawerOpen: false,
  setSelected: (selected) =>
    set({
      selected: selected ? { ...selected } : DEFAULT_LOCATION,
      focusTarget: selected ? { ...selected } : null,
    }),
  clearFocus: () =>
    set({
      focusTarget: null,
      detailsOpen: false,
    }),
  setDetailsOpen: (detailsOpen) => set({ detailsOpen: Boolean(detailsOpen) }),
  setSheetSnap: (updater) =>
    set((state) => ({
      sheetSnap: typeof updater === 'function' ? updater(state.sheetSnap) : updater,
    })),
  setDesktopDrawerOpen: (updater) =>
    set((state) => ({
      desktopDrawerOpen:
        typeof updater === 'function'
          ? Boolean(updater(state.desktopDrawerOpen))
          : Boolean(updater),
    })),
  toggleDesktopDrawer: () =>
    set((state) => ({
      desktopDrawerOpen: !state.desktopDrawerOpen,
    })),
  selectWithDetails: (selected) =>
    set((state) => ({
      selected: selected ? { ...selected } : state.selected,
      focusTarget: selected ? { ...selected } : null,
      detailsOpen: true,
      sheetSnap: state.sheetSnap === 'peek' ? 'half' : state.sheetSnap,
      desktopDrawerOpen: true,
    })),
}))