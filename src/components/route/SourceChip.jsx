// Small pill showing where a number comes from. "data" = measured by a NASA mission,
// "model" = calculated by RedMap from a published model or an assumption.
export const SOURCES = {
  MOLA: { kind: 'data', title: 'Mars Global Surveyor – Mars Orbiter Laser Altimeter (MOLA): global elevation. Slope, low ground and climbing are calculated from it.' },
  'MSL RAD': { kind: 'data', title: 'Curiosity (Mars Science Laboratory) Radiation Assessment Detector: about 0.64 mSv per sol at the surface.' },
  CRISM: { kind: 'data', title: 'Mars Reconnaissance Orbiter – Compact Reconnaissance Imaging Spectrometer: clay, carbonate and other minerals.' },
  HiRISE: { kind: 'data', title: 'Mars Reconnaissance Orbiter – High Resolution Imaging Science Experiment camera.' },
  CTX: { kind: 'data', title: 'Mars Reconnaissance Orbiter – Context Camera.' },
  ROVER: { kind: 'data', title: 'Measured by a rover on the surface (Perseverance or Curiosity).' },
  NASA: { kind: 'data', title: 'NASA orbital or surface data.' },
  MARS24: { kind: 'model', title: 'Calculated by RedMap with the Mars24 solar-position algorithm (Allison & McEwen 2000).' },
  EPHEM: { kind: 'model', title: 'Calculated by RedMap from JPL approximate planetary orbital elements (accurate to a few thousandths of an AU).' },
  MODEL: { kind: 'model', title: 'RedMap estimate, not a measurement: it depends on the assumptions listed in the app.' },
};

export default function SourceChip({ id }) {
  const s = SOURCES[id];
  if (!s) return null;
  return (
    <abbr className={`rm-src-chip rm-src-chip--${s.kind}`} title={s.title}>
      {id === 'EPHEM' ? 'JPL' : id}
    </abbr>
  );
}
