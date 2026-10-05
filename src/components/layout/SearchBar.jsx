import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import locations from '../../data/locations.json'
import { useMapStore } from '../../store/useMapStore'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const navigate = useNavigate()
  const setSelected = useMapStore((s) => s.setSelected)

  const q = query.trim().toLowerCase()
  const results = q
    ? locations.filter((l) =>
        [l.name, l.type, l.tag].some((v) => v.toLowerCase().includes(q))
      )
    : []

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const choose = (loc) => {
    setSelected(loc)
    setQuery('')
    setOpen(false)
    navigate('/')
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 bg-panel-2 border border-line rounded-full px-4 py-2 w-40 sm:w-56 xl:w-72">
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
          placeholder="Search location..."
          className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted sm:text-sm"
        />
        <Search size={16} className="text-muted" />
      </div>

      {open && q && (
        <div className="absolute top-12 right-0 w-72 max-w-[calc(100vw-1.5rem)] bg-panel border border-line rounded-xl overflow-hidden z-50 shadow-xl">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted">No location found</div>
          ) : (
            results.map((loc) => (
              <button
                key={loc.id}
                onClick={() => choose(loc)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-panel-2"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: loc.color }}
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium">{loc.name}</span>
                  <span className="block text-xs text-muted">
                    {loc.type} • {loc.tag}
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