import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useMarsLocations } from '../../services/marsLocations'
import { useMapStore } from '../../store/useMapStore'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const navigate = useNavigate()
  const locations = useMarsLocations()
  const setSelected = useMapStore((s) => s.setSelected)

  const q = query.trim().toLowerCase()
  const results = useMemo(() => {
    if (!q) return []
    return locations
      .filter((l) =>
        [l.name, l.type, l.tag, l.category].some(
          (v) => v && String(v).toLowerCase().includes(q)
        )
      )
      .slice(0, 12)
  }, [locations, q])

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (loc) => {
    setQuery('')
    setOpen(false)
    navigate('/')
    setTimeout(() => setSelected(loc), 0)
  }

  return (
    <div ref={boxRef} className="relative">
      {/* Phone e box ektu boro (w-48) ar padding kom (px-3), jate "Search location" puro dekhay */}
      <div className="flex items-center gap-1.5 bg-panel-2 border border-line rounded-full px-3 py-2 w-48 sm:gap-2 sm:px-4 sm:w-56 xl:w-72">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) choose(results[0])
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder="Search 439 Mars locations..."
          className="min-w-0 flex-1 truncate bg-transparent text-base outline-none placeholder:text-muted sm:text-sm"
        />
        <Search size={16} className="shrink-0 text-muted" />
      </div>

      {open && q && (
        <div className="absolute top-12 right-0 w-80 max-h-96 overflow-y-auto max-w-[calc(100vw-1.5rem)] bg-panel border border-line rounded-xl z-50 shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No location found</div>
          ) : (
            results.map((loc) => (
              <button
                key={loc.id}
                onClick={() => choose(loc)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-panel-2 border-b border-white/5 last:border-b-0"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: loc.color }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{loc.name}</span>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-300">
                      L{loc.level}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {loc.type}
                    {loc.diameter > 0 ? ` • Ø ${loc.diameter} km` : ' • Mission Hub'}
                    {` • ${loc.min_alt_km}–${loc.max_alt_km} km`}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}