import { Routes, Route } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ExplorePage from './pages/ExplorePage'
import LayersPage from './pages/LayersPage'
import MissionsPage from './pages/MissionsPage'
import RoutePlannerPage from './pages/RoutePlannerPage'
import SciencePage from './pages/SciencePage'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/layers" element={<LayersPage />} />
        <Route path="/missions" element={<MissionsPage />} />
        <Route path="/route" element={<RoutePlannerPage />} />
        <Route path="/science" element={<SciencePage />} />
      </Route>
    </Routes>
  )
}