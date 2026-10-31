import { create } from 'zustand'
import { DEFAULT_LOCATION } from '../services/marsLocations'

export const useMapStore = create((set) => ({
  selected: DEFAULT_LOCATION,
  detailsOpen: false,
  sheetSnap: 'peek',
  setSelected: (selected) => set({ selected: selected ? { ...selected } : selected }),
  setDetailsOpen: (detailsOpen) => set({ detailsOpen: Boolean(detailsOpen) }),
  setSheetSnap: (updater) =>
    set((state) => ({
      sheetSnap: typeof updater === 'function' ? updater(state.sheetSnap) : updater,
    })),
  selectWithDetails: (selected) =>
    set((state) => ({
      selected: selected ? { ...selected } : selected,
      detailsOpen: true,
      sheetSnap: state.sheetSnap === 'peek' ? 'half' : state.sheetSnap,
    })),
}))