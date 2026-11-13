const LEGENDS = {
  terrain: {
    title: 'Terrain',
    note: 'Mars er prokrito surface, kono extra color nai.',
    bar: null,
  },
  elevation: {
    title: 'Elevation',
    note: 'Uchu-nichu jaygar height. Neel = gobhir (crater, basin), lal = uchu (pahar, volcano).',
    bar: 'linear-gradient(to right,#281490,#1e5adc,#14bec8,#28be50,#e6dc28,#f0821e,#c8281e)',
    labels: ['Gobhir', 'Majhari', 'Uchu'],
  },
  geo: {
    title: 'Geological Features',
    note: 'Pathor ar crater er chhaya. Ujjol = uchu/shokto pathor, kalo = gorto ba chhaya.',
    bar: 'linear-gradient(to right,#111,#888,#eee)',
    labels: ['Gorto', 'Majhari', 'Ujjol pathor'],
  },
  minerals: {
    title: 'Minerals',
    note: 'Mineral er dhoron. Beguni/golapi = lauho-somriddho (iron oxide) mati, neel-sobuj = onno mineral.',
    bar: 'linear-gradient(to right,#140a3c,#46198c,#9628be,#e65abe,#78dce6)',
    labels: ['Kom', 'Majhari', 'Beshi'],
  },
  missions: {
    title: 'NASA Missions',
    note: 'Neel marker = rover/lander er landing site. Marker e click korle location dekhabe.',
    bar: null,
  },
  temp: {
    title: 'Temperature (est.)',
    note: 'Surface er tapmatra. Meru ankol thanda, equator er kache gorom.',
    bar: 'linear-gradient(to right,#1e3cc8,#7832be,#dc325a,#fa8c1e,#ffe146)',
    labels: ['-125°C', '-60°C', '+20°C'],
  },
  atmo: {
    title: 'Atmosphere',
    note: 'Pressure ar dhulor haze. Neel rong beshi mane pat-la batas, dhulor jhor er shombhabona.',
    bar: 'linear-gradient(to right,#243c70,#3c64a0,#6ea0d2)',
    labels: ['Kom', 'Majhari', 'Beshi'],
  },
}

// Click kora location er value ei layer e ki hobe
function valueFor(layer, loc) {
  switch (layer) {
    case 'elevation': return `Elevation: ${loc.elevation} km`
    case 'temp': return `Temperature: ${loc.temp}°C`
    case 'geo': return `Terrain: ${loc.terrain}`
    case 'minerals': return `Tags: ${loc.tags.join(', ')}`
    case 'missions': return `Mission: ${loc.mission.name} (${loc.mission.years})`
    case 'atmo': return 'Pressure: ~6 mbar (est.)'
    default: return `${loc.terrain}`
  }
}

export default function LayerLegend({ layer, selected }) {
  const info = LEGENDS[layer] || LEGENDS.terrain
  return (
    <>
      {/* Legend card (globe er niche-dane) */}
      <div className="absolute bottom-[132px] left-[330px] w-[330px] rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur-md">
        <div className="text-sm font-semibold">{info.title}</div>
        <div className="mt-1 text-xs text-gray-400">{info.note}</div>
        {info.bar && (
          <div className="mt-3">
            <div className="h-3 rounded-full" style={{ background: info.bar }} />
            <div className="mt-1 flex justify-between text-[11px] text-gray-400">
              {info.labels.map((l) => <span key={l}>{l}</span>)}
            </div>
          </div>
        )}
        <div className="mt-3 border-t border-white/10 pt-2 text-xs">
          <span className="text-gray-400">{selected.name}: </span>
          <span className="text-white">{valueFor(layer, selected)}</span>
        </div>
      </div>
    </>
  )
}