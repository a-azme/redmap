import { useId } from 'react'

export default function RedMapLogo({ className = 'h-12', showText = true }) {
  const uid = useId().replace(/:/g, '')
  const planet = `rm-planet-${uid}`
  const ring = `rm-ring-${uid}`
  const clip = `rm-clip-${uid}`

  return (
    <svg
      viewBox={showText ? '0 0 370 94' : '0 0 98 94'}
      className={className}
      role="img"
      aria-label="Red Map"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={planet} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ff7a45" />
          <stop offset="0.55" stopColor="#e2381f" />
          <stop offset="1" stopColor="#8c1a10" />
        </radialGradient>
        <linearGradient id={ring} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff3b30" />
          <stop offset="1" stopColor="#ff6a3d" />
        </linearGradient>
        <clipPath id={clip}>
          <circle cx="47" cy="47" r="32" />
        </clipPath>
      </defs>

      <g transform="rotate(-14 47 54)">
        <ellipse cx="47" cy="54" rx="46" ry="11" fill="none" stroke={`url(#${ring})`} strokeWidth="3.5" />
      </g>

      <circle cx="47" cy="47" r="32" fill={`url(#${planet})`} />
      <g clipPath={`url(#${clip})`} fill="#7a1a10" opacity="0.35">
        <ellipse cx="34" cy="36" rx="9" ry="6" />
        <ellipse cx="58" cy="52" rx="11" ry="7" />
        <ellipse cx="42" cy="62" rx="7" ry="4" />
        <ellipse cx="62" cy="33" rx="5" ry="4" />
      </g>

      <g transform="rotate(-14 47 54)">
        <path d="M1 54A46 11 0 0 0 93 54" fill="none" stroke={`url(#${ring})`} strokeWidth="3.5" strokeLinecap="round" />
      </g>

      {showText && (
        <text
          x="108"
          y="66"
          fontSize="54"
          fontWeight="800"
          fontFamily="Poppins, Montserrat, Inter, system-ui, sans-serif"
        >
          <tspan fill="#ff3b30">RED</tspan>
          <tspan fill="#ffffff" dx="10">MAP</tspan>
        </text>
      )}
    </svg>
  )
}