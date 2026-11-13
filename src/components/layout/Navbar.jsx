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
    <header className="h-[72px] shrink-0 flex items-center justify-between px-6 bg-panel border-b border-line z-20">
      <div className="flex items-center gap-4">
        <RedMapLogo className="h-12" />
        <span className="text-muted text-sm hidden lg:block">Interplanetary Survival Guide</span>
      </div>

      <nav className="flex items-center gap-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-4 h-[72px] text-sm border-b-2 transition ${
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

      <div className="flex items-center gap-3">
        <SearchBar />
        <div className="w-10 h-10 rounded-full bg-panel-2 border border-line flex items-center justify-center">
          <User size={18} className="text-muted" />
        </div>
      </div>
    </header>
  )
}