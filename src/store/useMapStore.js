import { create } from 'zustand'
import locations from '../data/locations.json'

export const useMapStore = create((set) => ({
  selected: locations[0],
  setSelected: (selected) => set({ selected }),
}))