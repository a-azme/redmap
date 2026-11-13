import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import ExplorePage from './pages/ExplorePage'
import GuidePage from './pages/GuidePage'
import RoutePlannerPage from './pages/RoutePlannerPage'

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<ExplorePage />} />
        <Route path="/layers" element={<Navigate to="/" replace />} />
        <Route path="/missions" element={<Navigate to="/?tab=missions" replace />} />
        <Route path="/route" element={<RoutePlannerPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/science" element={<Navigate to="/route" replace />} />
      </Route>
    </Routes>
  )
}