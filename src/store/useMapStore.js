import { create } from 'zustand'
import { DEFAULT_LOCATION } from '../services/marsLocations'

export const useMapStore = create((set) => ({
  selected: DEFAULT_LOCATION,
  setSelected: (selected) => set({ selected: selected ? { ...selected } : selected }),
}))