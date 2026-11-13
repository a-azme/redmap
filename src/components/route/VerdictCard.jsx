import { useMemo, useState } from 'react'
import { ShieldCheck, AlertTriangle, OctagonAlert, ChevronDown } from 'lucide-react'
import { buildSafetyBrief } from '../../lib/safetyBrief'

const DOT_COLORS = {
  stop: '#ff6b6b',
  caution: '#f5a524',
  ok: '#4be08a',
  info: '#7fd4ff',
}

export default function VerdictCard({ route, plan, spaceWeather }) {
  const brief = useMemo(
    () => buildSafetyBrief(route, plan, spaceWeather),
    [route, plan, spaceWeather]
  )
  const [open, setOpen] = useState(false)

  if (!brief) return null

  const isNoGo = brief.verdict === 'NO-GO'
  const isCaution = brief.verdict === 'CAUTION'
  const VIcon = isNoGo ? OctagonAlert : isCaution ? AlertTriangle : ShieldCheck
  const toneClass = isNoGo ? 'is-nogo' : isCaution ? 'is-caution' : 'is-go'

  return (
    <section className="rm-card rm-verdict">
      <div className={`rm-verdict__banner ${toneClass}`}>
        <div className="rm-verdict__head">
          <span className="rm-verdict__badge">
            <VIcon size={14} />
            <strong>{brief.verdict}</strong>
          </span>
          <button
            type="button"
            className="rm-verdict__toggle"
            onClick={() => setOpen((o) => !o)}
          >
            <span>{open ? 'Hide Checks' : `Flight Checks (${brief.checks.length})`}</span>
            <ChevronDown size={13} className={open ? 'rotate-180 transition' : 'transition'} />
          </button>
        </div>
        <p className="rm-verdict__summary">{brief.summary}</p>
      </div>

      <ul className="rm-verdict__chips">
        {brief.checks.map((c) => (
          <li key={c.id} className="rm-verdict__chip" title={`${c.title}: ${c.detail}`}>
            <span className="rm-verdict__dot" style={{ background: DOT_COLORS[c.status] }} />
            <span>{c.chip || c.title}</span>
          </li>
        ))}
      </ul>

      {open && (
        <ul className="rm-verdict__list">
          {brief.checks.map((c) => (
            <li
              key={c.id}
              className={`rm-warn rm-warn--${
                c.status === 'stop' ? 'critical' : c.status === 'caution' ? 'caution' : 'ok'
              }`}
            >
              <div>
                <strong>{c.title}</strong>
                <p>{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
