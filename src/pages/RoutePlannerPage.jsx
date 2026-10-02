import { useEffect } from 'react'
import { useRouteStore } from '../store/useRouteStore'
import RouteLayer from '../components/map/RouteLayer'
import RoutePanel from '../components/route/RoutePanel'
import RouteOverview from '../components/route/RouteOverview'
import ElevationProfile from '../components/route/ElevationProfile'
import RouteWarnings from '../components/route/RouteWarnings'
import ScienceStops from '../components/route/ScienceStops'
import TerrainConditions from '../components/info/TerrainConditions'

export default function RoutePlannerPage() {
  const result = useRouteStore((s) => s.result)
  const planRoute = useRouteStore((s) => s.planRoute)

  useEffect(() => {
    if (!result) planRoute()
  }, [result, planRoute])

  return (
    <div className="h-full relative bg-bg">
      {result ? (
        <RouteLayer result={result} />
      ) : (
        <div className="h-full flex items-center justify-center text-muted text-sm">
          Route nai. Bam pashe location select kore Plan Route chapo.
        </div>
      )}

      <RoutePanel />

      {result && (
        <>
          <aside className="absolute right-4 top-4 bottom-4 w-[330px] bg-panel/95 border border-line rounded-2xl p-5 overflow-y-auto z-10 space-y-6">
            <div>
              <div className="text-xs text-muted">Destination</div>
              <div className="text-xl font-bold">{result.destLoc.name}</div>
              <div className="text-xs text-muted mt-1">
                {result.destLoc.lat}° N, {result.destLoc.lon}° E
              </div>
              <div className="text-xs text-muted">
                {result.destLoc.type} • {result.destLoc.tag}
              </div>
            </div>
            <TerrainConditions analysis={result.analysis} />
            <RouteWarnings analysis={result.analysis} />
            <ScienceStops nearPois={result.nearPois} mode={result.mode} />
          </aside>

          <div className="absolute bottom-4 left-4 right-[362px] h-[170px] flex gap-4 z-10">
            <RouteOverview analysis={result.analysis} />
            <ElevationProfile profile={result.analysis.profile} />
          </div>
        </>
      )}
    </div>
  )
}