import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const TEXTURE_URL = '/images/mars-texture.jpg';
// 0 if your texture is centred on 0° longitude (most are, range -180..180).
// Use 180 if the texture runs 0..360 starting at its left edge.
const TEXTURE_LON_OFFSET = 0;
const R = 1;
const HOME = new THREE.Vector3(0, 0.6, 3.2);

// lat / lon (°E) -> point on the sphere
const toVec = (lat, lon, r = R) => {
  const phi = (lat * Math.PI) / 180;
  const lam = ((lon + TEXTURE_LON_OFFSET) * Math.PI) / 180;
  return new THREE.Vector3(
    r * Math.cos(phi) * Math.cos(lam),
    r * Math.sin(phi),
    -r * Math.cos(phi) * Math.sin(lam)
  );
};

export default function RouteGlobe({ route, view = 'terrain', selectedStopIds = [] }) {
  const mountRef = useRef(null);
  const markersRef = useRef(null);
  const ctx = useRef({});
  const lastRoute = useRef(null);

  /* ---------- 1. scene setup (once) ---------- */
  useEffect(() => {
    const mount = mountRef.current;
    const c = ctx.current;
    lastRoute.current = null;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.copy(HOME);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    // lights follow the camera, so the side you look at is always lit
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xfff1e0, 2.2);
    sun.position.set(2, 1.5, 3);
    camera.add(sun);

    // globe
    const mat = new THREE.MeshStandardMaterial({ color: 0xb5532f, roughness: 1, metalness: 0 });
    const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 128), mat);
    scene.add(globe);
    new THREE.TextureLoader().load(
      TEXTURE_URL,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      },
      undefined,
      () => console.warn(`RouteGlobe: could not load ${TEXTURE_URL} – showing a plain red globe.`)
    );

    // thin atmosphere glow
    scene.add(new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.025, 64, 64),
      new THREE.MeshBasicMaterial({ color: 0xff9a6b, transparent: true, opacity: 0.1, side: THREE.BackSide, depthWrite: false })
    ));

    // stars
    const starPos = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(20 + Math.random() * 10);
      starPos.set([v.x, v.y, v.z], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true })));

    // route container (rebuilt on every new route)
    const routeGroup = new THREE.Group();
    scene.add(routeGroup);

    // controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.15;
    controls.maxDistance = 4.5;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.7;
    controls.autoRotateSpeed = 0.5;
    controls.addEventListener('start', () => { c.flyTarget = null; });

    // resize
    const resize = () => {
      const w = mount.clientWidth || 1, h = mount.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    Object.assign(c, { scene, camera, renderer, controls, routeGroup, markers: [], flyTarget: null, fit: HOME.clone(), curve: null, rover: null });

    // render loop
    const clock = new THREE.Clock();
    const camDir = new THREE.Vector3();
    const proj = new THREE.Vector3();
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      if (c.flyTarget) {
        camera.position.lerp(c.flyTarget, 0.06);
        if (camera.position.distanceTo(c.flyTarget) < 0.01) c.flyTarget = null;
      }
      if (c.curve && c.rover) c.rover.position.copy(c.curve.getPointAt((t * 0.05) % 1));

      controls.update();
      renderer.render(scene, camera);

      // place HTML markers on the sphere, hide the ones on the far side
      const w = mount.clientWidth, h = mount.clientHeight;
      camDir.copy(camera.position);
      const dist = camDir.length();
      camDir.normalize();
      for (const m of c.markers) {
        proj.copy(m.pos).project(camera);
        const visible = m.n.dot(camDir) > R / dist + 0.01 && proj.z < 1;
        m.el.style.display = visible ? '' : 'none';
        if (visible) m.el.style.transform = `translate(${(proj.x * 0.5 + 0.5) * w}px, ${(-proj.y * 0.5 + 0.5) * h}px)`;
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      markersRef.current && (markersRef.current.innerHTML = '');
      for (const k of Object.keys(c)) delete c[k];
    };
  }, []);

  /* ---------- 2. build the route (when route / selected stops change) ---------- */
  useEffect(() => {
    const c = ctx.current;
    if (!c.scene) return;

    c.routeGroup.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    c.routeGroup.clear();
    markersRef.current.innerHTML = '';
    c.markers = [];
    c.curve = null;
    c.rover = null;
    c.controls.autoRotate = !route;
    if (!route) return;

    // glowing route line lying on the surface
    const pts = route.path.map((p) => toVec(p.lat, p.lon, R * 1.004));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const segs = Math.max(200, pts.length * 4);
    c.routeGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, segs, 0.0042, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x2bb5f5 })
    ));
    c.routeGroup.add(new THREE.Mesh(
      new THREE.TubeGeometry(curve, segs, 0.011, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x2bb5f5, transparent: true, opacity: 0.22, depthWrite: false })
    ));
    const rover = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    c.routeGroup.add(rover);
    c.curve = curve;
    c.rover = rover;

    // HTML markers (crisp text, hover labels)
    const addMarker = (lat, lon, { cls, icon = '', label, always = false }) => {
      const el = document.createElement('div');
      el.className = `rm-m rm-m--${cls}${always ? ' is-always' : ''}`;
      const dot = document.createElement('span');
      dot.className = 'rm-m__dot';
      dot.textContent = icon;
      const lab = document.createElement('span');
      lab.className = 'rm-m__lab';
      lab.textContent = label;
      el.append(dot, lab);
      markersRef.current.appendChild(el);
      const pos = toVec(lat, lon, R * 1.006);
      c.markers.push({ el, pos, n: pos.clone().normalize() });
    };

    route.warnings
      .filter((w) => w.severity !== 'info' && w.toKm - w.fromKm < route.distanceKm - 1)
      .forEach((w) => addMarker(w.lat, w.lon, { cls: w.severity, icon: '▲', label: w.title }));
    route.stops.forEach((s) =>
      addMarker(s.lat, s.lon, { cls: selectedStopIds.includes(s.id) ? 'stop-on' : 'stop', label: s.title, always: selectedStopIds.includes(s.id) }));
    addMarker(route.start.lat, route.start.lon, { cls: 'start', label: `Start: ${route.start.name}`, always: true });
    addMarker(route.end.lat, route.end.lon, { cls: 'end', label: `Destination: ${route.end.name}`, always: true });

    // fly the camera to the route (only when a NEW route is planned)
    if (lastRoute.current !== route) {
      lastRoute.current = route;
      const mid = new THREE.Vector3();
      pts.forEach((p) => mid.add(p.clone().normalize()));
      mid.normalize();
      let ext = 0;
      pts.forEach((p) => { ext = Math.max(ext, Math.acos(Math.min(1, mid.dot(p.clone().normalize())))); });
      const D = Math.min(4, Math.max(1.6, 1.25 + ext * 1.7));
      c.fit = mid.clone().multiplyScalar(D);
      c.flyTarget = c.fit.clone();
    }
  }, [route, selectedStopIds]);

  /* ---------- zoom / recenter buttons ---------- */
  const zoom = (f) => ctx.current.camera?.position.multiplyScalar(f);
  const recenter = () => { const c = ctx.current; if (c.fit) c.flyTarget = c.fit.clone(); };
  const resetView = () => { ctx.current.flyTarget = HOME.clone(); };

  return (
    <div className="rm-globe">
      <div ref={mountRef} className={`rm-globe__canvas view-${view}`} />
      <div ref={markersRef} className="rm-globe__markers" />
      <div className="rm-ctrls">
        <button type="button" onClick={() => zoom(0.8)} title="Zoom in">+</button>
        <button type="button" onClick={() => zoom(1.25)} title="Zoom out">−</button>
        <button type="button" onClick={recenter} title="Centre on route">◎</button>
        <button type="button" onClick={resetView} title="Reset view">⟳</button>
      </div>
    </div>
  );
}