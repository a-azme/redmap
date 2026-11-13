import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'

export default function MainLayout() {
  return (
    <div className="h-full flex flex-col bg-bg">
      <Navbar />
      <main className="relative min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}