import { NavLink } from 'react-router-dom'
import { Globe, Layers, Rocket, Route, FlaskConical, User } from 'lucide-react'
import SearchBar from './SearchBar'
import RedMapLogo from '../ui/RedMapLogo'

const tabs = [
  { to: '/', label: 'Explore', icon: Globe },
  { to: '/layers', label: 'Layers', icon: Layers },
  { to: '/missions', label: 'Missions', icon: Rocket },
  { to: '/route', label: 'Route Planner', icon: Route },
  { to: '/science', label: 'Science', icon: FlaskConical },
]

export default function Navbar() {
  return (
    <header className="z-20 flex shrink-0 flex-wrap items-center justify-between border-b border-line bg-panel px-3 xl:h-[72px] xl:flex-nowrap xl:px-6">
      <div className="flex h-14 items-center gap-4 xl:h-auto">
        <RedMapLogo className="h-9 xl:h-12" />
        <span className="hidden text-sm text-muted min-[1340px]:block">Interplanetary Survival Guide</span>
      </div>

      <nav className="order-last flex w-full overflow-x-auto border-t border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:order-none xl:w-auto xl:gap-2 xl:overflow-visible xl:border-t-0">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex min-w-fit flex-1 flex-col items-center justify-center gap-0.5 border-b-2 px-3 py-1.5 text-[11px] transition sm:flex-row sm:gap-2 sm:py-2.5 sm:text-sm xl:h-[72px] xl:flex-none xl:px-4 xl:py-0 ${
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

      <div className="flex h-14 items-center gap-3 xl:h-auto">
        <SearchBar />
        <div className="hidden h-10 w-10 items-center justify-center rounded-full border border-line bg-panel-2 sm:flex">
          <User size={18} className="text-muted" />
        </div>
      </div>
    </header>
  )
}
