import { Globe, Map, MapPin, Truck, Bookmark } from 'lucide-react'

const items = [
  { label: '3D Globe', icon: Globe },
  { label: 'Map View', icon: Map },
  { label: 'Locations', icon: MapPin },
  { label: 'Rover Tracks', icon: Truck },
  { label: 'Bookmarks', icon: Bookmark },
]

export default function SidebarLeft({ active = '3D Globe', onChange }) {
  return (
    <aside className="absolute left-0 top-6 w-48 bg-panel/90 backdrop-blur border border-line rounded-r-xl py-2 z-10">
      {items.map(({ label, icon: Icon }) => (
        <button
          key={label}
          onClick={() => onChange?.(label)}
          className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition ${
            active === label
              ? 'bg-red/20 text-white'
              : 'text-muted hover:text-white hover:bg-panel-2'
          }`}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </aside>
  )
}