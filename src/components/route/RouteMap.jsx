import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TREK = 'https://trek.nasa.gov/tiles/Mars/EQ';
// Same layer for terrain + satellite for now; swap names here if you want other Trek layers.
// ext = tile file extension, maxNative = deepest zoom the service has (verify, see notes)
const LAYERS = {
  terrain:   { layer: 'Mars_Viking_MDIM21_ClrMosaic_global_232m', ext: 'jpg', maxNative: 7 },
  satellite: { layer: 'Mars_Viking_MDIM21_ClrMosaic_global_232m', ext: 'jpg', maxNative: 7 },
  elevation: { layer: 'Mars_MGS_MOLA_ClrShade_merge_global_463m',  ext: 'png', maxNative: 6 },
};
const tileUrl = (v) => `${TREK}/${LAYERS[v].layer}/1.0.0/default/default028mm/{z}/{y}/{x}.${LAYERS[v].ext}`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (lon) => (lon > 180 ? lon - 360 : lon); // 0..360 -> -180..180 (Trek tiles are centred on 0°)

function unwrap(points) {
  let prev = null;
  return points.map((p) => {
    let lon = norm(p.lon);
    if (prev !== null) {
      while (lon - prev > 180) lon -= 360;
      while (prev - lon > 180) lon += 360;
    }
    prev = lon;
    return [p.lat, lon];
  });
}

const pin = (cls, label, icon = '', always = false) =>
  L.divIcon({
    className: 'rm-pinwrap',
    iconSize: [0, 0],
    html: `<div class="rm-pin rm-pin--${cls}${always ? ' is-always' : ''}"><span class="rm-pin__dot">${icon}</span><span class="rm-pin__lab">${esc(label)}</span></div>`,
  });

export default function RouteMap({ route, view = 'terrain', selectedStopIds = [] }) {
  const elRef = useRef(null);
  const ref = useRef({});
  const lastRoute = useRef(null);

  /* ---- create the map once ---- */
  useEffect(() => {
    const map = L.map(elRef.current, {
      crs: L.CRS.EPSG4326,       // Trek EQ tiles: 2x1 tiles at zoom 0
      center: [10, 0],
      zoom: 2,
      minZoom: 1,
      maxZoom: 10,
      zoomSnap: 0.25,
      zoomControl: false,
      attributionControl: true,
    });
    map.attributionControl.setPrefix(false);

    const tiles = L.tileLayer(tileUrl('terrain'), {
      tileSize: 256,
      maxNativeZoom: LAYERS.terrain.maxNative,
      maxZoom: 10,
      attribution: 'NASA/JPL-Caltech/USGS · Mars Trek',
    }).addTo(map);
    tiles.once('tileerror', () =>
      console.warn('RouteMap: a Mars Trek tile failed to load. Check the layer name / file extension in LAYERS.'));

    const group = L.layerGroup().addTo(map);
    ref.current = { map, tiles, group, raf: 0, home: { center: [10, 0], zoom: 2 }, fit: null };

    return () => { cancelAnimationFrame(ref.current.raf); map.remove(); ref.current = {}; };
  }, []);

  /* ---- switch base layer ---- */
  useEffect(() => {
    const { tiles } = ref.current;
    if (!tiles) return;
    tiles.setUrl(tileUrl(view));
    tiles.options.maxNativeZoom = LAYERS[view].maxNative;
    tiles.redraw();
  }, [view]);

  /* ---- draw route ---- */
  useEffect(() => {
    const c = ref.current;
    if (!c.map) return;
    cancelAnimationFrame(c.raf);
    c.group.clearLayers();
    if (!route) return;

    const latlngs = unwrap(route.path);
    const centerLon = (Math.min(...latlngs.map((p) => p[1])) + Math.max(...latlngs.map((p) => p[1]))) / 2;
    const place = (lat, lon) => {            // put a marker on the same world copy as the route
      let l = norm(lon);
      while (l - centerLon > 180) l -= 360;
      while (centerLon - l > 180) l += 360;
      return [lat, l];
    };

    // glow + dashed line
    L.polyline(latlngs, { color: '#2bb5f5', weight: 12, opacity: 0.2, interactive: false }).addTo(c.group);
    L.polyline(latlngs, { color: '#2bb5f5', weight: 4, dashArray: '10 8', className: 'rm-dashline', interactive: false }).addTo(c.group);

    // hazards
    route.warnings
      .filter((w) => w.severity !== 'info' && w.toKm - w.fromKm < route.distanceKm - 1)
      .forEach((w) => L.marker(place(w.lat, w.lon), { icon: pin(w.severity, w.title, '▲') }).addTo(c.group));

    // science stops
    route.stops.forEach((s) => {
      const on = selectedStopIds.includes(s.id);
      L.marker(place(s.lat, s.lon), { icon: pin(on ? 'stop-on' : 'stop', s.title, '', on), zIndexOffset: 500 }).addTo(c.group);
    });

    // start / destination
    L.marker(latlngs[0], { icon: pin('start', `Start: ${route.start.name}`, '', true), zIndexOffset: 1000 }).addTo(c.group);
    L.marker(latlngs[latlngs.length - 1], { icon: pin('end', `Destination: ${route.end.name}`, '', true), zIndexOffset: 1000 }).addTo(c.group);

    // rover dot travelling along the route
    const rover = L.circleMarker(latlngs[0], { radius: 5, color: '#fff', weight: 2, fillColor: '#2bb5f5', fillOpacity: 1, interactive: false }).addTo(c.group);
    const t0 = performance.now();
    const step = (now) => {
      const f = (((now - t0) / 1000) * 0.06) % 1;
      const x = f * (latlngs.length - 1), i = Math.floor(x), k = x - i;
      const a = latlngs[i], b = latlngs[Math.min(i + 1, latlngs.length - 1)];
      rover.setLatLng([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      c.raf = requestAnimationFrame(step);
    };
    c.raf = requestAnimationFrame(step);

    // frame the route in the free area between the side panels (only for a NEW route)
    c.fit = L.latLngBounds(latlngs);
    if (lastRoute.current !== route) {
      lastRoute.current = route;
      c.map.flyToBounds(c.fit, { paddingTopLeft: [340, 90], paddingBottomRight: [380, 250], maxZoom: 7, duration: 1.2 });
    }
  }, [route, selectedStopIds]);

  const m = () => ref.current.map;
  return (
    <div className="rm-map">
      <div ref={elRef} className={`rm-leaflet view-${view}`} />
      <div className="rm-ctrls">
        <button type="button" onClick={() => m()?.zoomIn()} title="Zoom in">+</button>
        <button type="button" onClick={() => m()?.zoomOut()} title="Zoom out">−</button>
        <button type="button" onClick={() => ref.current.fit && m().flyToBounds(ref.current.fit, { paddingTopLeft: [340, 90], paddingBottomRight: [380, 250], maxZoom: 7 })} title="Centre on route">◎</button>
        <button type="button" onClick={() => m()?.flyTo(ref.current.home.center, ref.current.home.zoom)} title="Whole planet">⟳</button>
      </div>
    </div>
  );
}