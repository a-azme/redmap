import { useEffect, useRef } from 'react'
import Globe from 'globe.gl'

const LOCAL_TEXTURE = '/textures/8k_mars.jpg'

function makeMarsTexture() {
  const w = 2048
  const h = 1024
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')

  const base = ctx.createLinearGradient(0, 0, 0, h)
  base.addColorStop(0, '#d9c3b0')
  base.addColorStop(0.15, '#b5653a')
  base.addColorStop(0.5, '#a8512c')
  base.addColorStop(0.85, '#b5653a')
  base.addColorStop(1, '#d9c3b0')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  const colors = ['#7a3a1e', '#c47a4a', '#8f4526', '#d19468', '#5e2c17']
  for (let i = 0; i < 1800; i++) {
    const x = Math.random() * w
    const y = Math.random() * h
    const r = 8 + Math.random() * 80
    ctx.globalAlpha = 0.05 + Math.random() * 0.15
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * (0.4 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  return c.toDataURL('image/jpeg', 0.92)
}

export default function MarsGlobe({ locations, focus, onSelect }) {
  const ref = useRef(null)
  const globeRef = useRef(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Globe ekbar-i toiri hobe
  useEffect(() => {
    const el = ref.current
    let cancelled = false

    const globe = Globe()(el)
      .width(el.clientWidth)
      .height(el.clientHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .globeImageUrl(makeMarsTexture())
      .atmosphereColor('#e5322d')
      .atmosphereAltitude(0.18)
      .globeCurvatureResolution(1)
      .labelLat('lat')
      .labelLng('lon')
      .labelText('name')
      .labelSize(1.0)
      .labelDotRadius(0.5)
      .labelResolution(3)
      .labelColor((d) => d.color)
      .labelAltitude(0.02)
      .onLabelClick((d) => onSelectRef.current?.(d))

    // Texture sharp korar jonno max anisotropy
    const sharpen = () => {
      const map = globe.globeMaterial().map
      if (map) {
        map.anisotropy = globe.renderer().capabilities.getMaxAnisotropy()
        map.needsUpdate = true
      }
    }
    globe.onGlobeReady(sharpen)

    const img = new Image()
    img.onload = () => {
      console.log('Mars texture loaded:', img.width + 'x' + img.height)
      if (cancelled) return
      globe.globeImageUrl(LOCAL_TEXTURE)
      setTimeout(sharpen, 500)
    }
    img.onerror = () => {
      console.warn('Mars texture NOT found at', LOCAL_TEXTURE, '- using generated texture')
    }
    img.src = LOCAL_TEXTURE

    // High quality rendering
    globe.renderer().setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, 2), 3))

    const controls = globe.controls()
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.4
    controls.minDistance = 120 // aro close zoom korte dey
    controls.zoomSpeed = 0.8

    globe.pointOfView({ lat: 18, lng: 77, altitude: 2.2 })
    globeRef.current = globe

    const onResize = () => globe.width(el.clientWidth).height(el.clientHeight)
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      globe._destructor && globe._destructor()
      el.innerHTML = ''
      globeRef.current = null
    }
  }, [])

  // Locations change hole sudhu label update hobe
  useEffect(() => {
    globeRef.current?.labelsData(locations || [])
  }, [locations])

  useEffect(() => {
    if (!focus || !globeRef.current) return
    globeRef.current.controls().autoRotate = false
    globeRef.current.pointOfView(
      { lat: focus.lat, lng: focus.lon, altitude: 1.6 },
      1000
    )
  }, [focus])

  return <div ref={ref} className="w-full h-full" />
}