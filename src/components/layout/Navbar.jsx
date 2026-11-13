import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { BookOpen, Clock, Globe, Radio, Route } from 'lucide-react'
import SearchBar from './SearchBar'
import RedMapLogo from '../ui/RedMapLogo'
import { coordinatedMarsTime } from '../../lib/marsTime'
import { commsDelay } from '../../lib/commsDelay'

const tabs = [
  { to: '/', label: 'Explore', icon: Globe },
  { to: '/route', label: 'Route Planner', icon: Route },
  { to: '/guide', label: 'Survival Guide', icon: BookOpen },
]

export default function Navbar() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const mtc = coordinatedMarsTime(now)
  const comms = commsDelay(now)

  return (
    <header className="z-20 flex shrink-0 flex-wrap items-center justify-between border-b border-line bg-panel px-3 xl:h-[72px] xl:flex-nowrap xl:px-6">
      <div className="flex h-14 items-center gap-4 xl:h-auto">
        <RedMapLogo className="h-9 xl:h-12" />
        <span className="hidden text-sm text-muted min-[1340px]:block">
          Interplanetary Survival Guide
        </span>
      </div>

      <nav className="order-last flex w-full overflow-x-auto border-t border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:order-none xl:w-auto xl:gap-2 xl:overflow-visible xl:border-t-0">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-w-fit flex-1 flex-col items-center justify-center gap-0.5 border-b-2 px-3 py-1.5 text-[11px] whitespace-nowrap transition sm:flex-row sm:gap-2 sm:py-2.5 sm:text-sm xl:h-[72px] xl:flex-none xl:px-4 xl:py-0 ${
                isActive
                  ? 'text-white border-red'
                  : 'text-muted border-transparent hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="flex h-14 items-center gap-2.5 xl:h-auto">
        <SearchBar />
        <Link
          to="/guide"
          title="Live Coordinated Mars Time & Earth-Mars One-Way Light Delay"
          className="hidden items-center gap-2 rounded-xl border border-line bg-panel-2 px-3 py-2 text-xs text-gray-200 transition hover:border-red-500/50 hover:text-white md:flex"
        >
          <Clock size={14} className="shrink-0 text-red-400" />
          <span className="font-mono tabular-nums">MTC {mtc.mtcClock}</span>
          <span className="hidden text-white/30 lg:inline">·</span>
          <span className="hidden items-center gap-1 font-mono text-[11px] tabular-nums text-amber-300 lg:inline-flex">
            <Radio size={12} />
            {comms.oneWayMin}m
          </span>
        </Link>
      </div>
    </header>
  )
}
