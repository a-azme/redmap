// Real NASA Mars Surface Mission Point-of-View (POV) Reconnaissance Service
// Pairs authentic, verified high-resolution NASA JPL Photojournal (PIA) Mastcam, Mastcam-Z,
// and Navcam surface photography from Gale Crater (Curiosity) and Jezero Crater (Perseverance)
// with astronaut field briefings, footing hazard notes, and interactive geological target reticles.

const POV_CATALOG = {
  boxwork: {
    nasaId: 'PIA25175',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA25175/PIA25175~large.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA25175/PIA25175~orig.jpg',
    resolution: '5833 × 3324 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam 100mm Stereo Mosaic',
    sol: 'Sol 3415–4365 (Mount Sharp Boxwork & Ridge Campaign)',
    caption:
      'Eye-level Mastcam view of cemented mineral fracture ridges ("gator-back" boxwork ribs) standing in relief on Mount Sharp where ancient mineralized groundwater flowed through bedrock fractures.',
    footing:
      'Cemented sandstone ridge crests with loose windblown basaltic sand in intervening hollows; 8–14° local slope.',
    tool: 'Rotary Percussive Drill + APXS + MAHLI Hand Lens',
    hotspots: [
      {
        id: 'bw-1',
        x: 34,
        y: 58,
        tag: 'Astrobiology',
        label: 'Cemented Boxwork Vein',
        detail:
          'Raised mineral-filled fracture ridge resistant to wind erosion; prime target to core for late-stage subsurface fluid biosignatures.',
      },
      {
        id: 'bw-2',
        x: 68,
        y: 66,
        tag: 'Footing Hazard',
        label: 'Eolian Hollow & Regolith Trap',
        detail:
          'Wind-scoured depression between boxwork walls filled with fine basaltic sand; step along cemented bedrock ribs.',
      },
      {
        id: 'bw-3',
        x: 52,
        y: 28,
        tag: 'Stratigraphy',
        label: 'Upper Mount Sharp Sulfate Bench',
        detail:
          'Layered sulfate-bearing strata rising above the fracture unit, offering steep scarp walls for solar storm shielding.',
      },
    ],
  },
  'poi-boxwork-polygons': {
    nasaId: 'PIA21263',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA21263/PIA21263~large.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA21263/PIA21263~orig.jpg',
    resolution: '4229 × 2149 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Right + Left Mosaic',
    sol: 'Sol 1555 (Polygonal Fracture Network)',
    caption:
      'Polygonal desiccation and groundwater-cemented fracture network on Mount Sharp formed by mineral precipitation across ancient mudstone slabs.',
    footing: 'Angular cemented fracture ribs; watch suit boot traction on 11° cross-slopes.',
    tool: 'ChemCam LIBS + Core Drill',
    hotspots: [
      {
        id: 'bwp-1',
        x: 42,
        y: 54,
        tag: 'Boxwork Ridge',
        label: 'Polygonal Mineral Junction',
        detail: 'Triple-junction fracture vein enriched in calcium and magnesium sulfates.',
      },
      {
        id: 'bwp-2',
        x: 74,
        y: 62,
        tag: 'Sampling',
        label: 'Protected Bedrock Alcove',
        detail: 'Low-UV shadowed face along the ridge wall ideal for organic molecule preservation.',
      },
    ],
  },
  'poi-boxwork-junction': {
    nasaId: 'PIA19676',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA19676/PIA19676~large.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA19676/PIA19676~orig.jpg',
    resolution: '3946 × 2455 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam 34mm Geological Contact Survey',
    sol: 'Sol 992 (Mount Sharp Fracture Contact Zone)',
    caption:
      'Light-toned mineral veins and resistant fracture ridges along the Mount Sharp geological contact zone.',
    footing: 'Stepped bedrock ledges; use trekking staff on 12° steps.',
    tool: 'MAHLI Microscopic Imager + APXS',
    hotspots: [
      {
        id: 'bwj-1',
        x: 48,
        y: 52,
        tag: 'Mineral Vein',
        label: 'Diagenetic Fracture Fill',
        detail:
          'Light-toned sulfate and silica cementation recording multiple episodes of groundwater recharge.',
      },
      {
        id: 'bwj-2',
        x: 25,
        y: 68,
        tag: 'Mobility',
        label: 'Low-Angle Ramp Bypass',
        detail:
          'Natural 7° bedrock ramp allowing suited crew to bypass the steeper 16° scarp face.',
      },
    ],
  },
  gediz: {
    nasaId: 'PIA26367',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA26367/PIA26367~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA26367/PIA26367~orig.jpg',
    resolution: '3231 × 1170 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Left 180° Channel Panorama',
    sol: 'Sol 4142 (Gediz Vallis Channel)',
    caption:
      '180-degree Mastcam panorama of the Gediz Vallis Ridge and debris channel carved into Mount Sharp, where late-stage water flows and landslides deposited boulder heaps and sulfur-bearing stones.',
    footing: 'Angular talus cobbles and loose sulfate gravel; high boot-cuff abrasion zone.',
    tool: 'APXS Spectrometer + Sealed Sample Tube',
    hotspots: [
      {
        id: 'gv-1',
        x: 46,
        y: 64,
        tag: 'Channel Floor',
        label: 'Gediz Vallis Debris Apron',
        detail:
          'Fluvial and debris-flow deposits washed down from high on Mount Sharp, providing access to upper-mountain lithologies.',
      },
      {
        id: 'gv-2',
        x: 68,
        y: 36,
        tag: 'Radiation Shelter',
        label: 'Gediz Vallis Ridge Scarp Wall',
        detail:
          'Steep debris-flow ridge flank blocking ~34% of horizon sky angle against solar energetic protons.',
      },
    ],
  },
  'poi-gediz-sulfur': {
    nasaId: 'PIA26210',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA26210/PIA26210~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA26210/PIA26210~orig.jpg',
    resolution: '5818 × 2555 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam High-Res Mosaic',
    sol: 'Sol 4252 (Convict Lake Sulfur Field)',
    caption:
      'High-resolution Mastcam panorama of the bright elemental sulfur stone field inside the Gediz Vallis channel on Mount Sharp, where Curiosity crushed a rock and discovered pure yellow native sulfur crystals.',
    footing: 'Unconsolidated debris apron cobbles; maintain 3 m buddy spacing.',
    tool: 'APXS + Geological Hammer + Sample Tube',
    hotspots: [
      {
        id: 'gvs-1',
        x: 45,
        y: 65,
        tag: 'Mineralogy',
        label: 'Pure Elemental Sulfur Nodules (S₈)',
        detail:
          'Crystalline yellow native sulfur interior confirmed by Alpha Particle X-Ray Spectrometer.',
      },
      {
        id: 'gvs-2',
        x: 70,
        y: 48,
        tag: 'Stratigraphy',
        label: 'Gediz Vallis Channel Margin',
        detail: 'Light-toned sulfate bedrock bounding the sulfur-bearing cobble field.',
      },
    ],
  },
  'poi-marker-band': {
    nasaId: 'PIA23137',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA23137/PIA23137~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA23137/PIA23137~orig.jpg',
    resolution: '5699 × 1322 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Wide Valley Panorama',
    sol: 'Sol 2302–3684 (Mount Sharp Wave-Rippled Beds)',
    caption:
      'Wide Mastcam panorama of undulating wave-rippled sedimentary beds and valley walls on Mount Sharp—evidence of shallow, ice-free ancient lake waters sloshing against the mountain flank.',
    footing: 'Hard, iron-rich indurated bedrock bench; very high rock hardness.',
    tool: 'Laser Spectrometer + Float Grab Sample',
    hotspots: [
      {
        id: 'mb-1',
        x: 54,
        y: 58,
        tag: 'Paleolake',
        label: 'Symmetric Wave Ripples',
        detail:
          'Centimeter-scale fossilized ripples formed by wind-driven waves in a shallow, ice-free ancient lake.',
      },
      {
        id: 'mb-2',
        x: 28,
        y: 38,
        tag: 'Shelter Wall',
        label: 'Valley Butte Escarpment',
        detail:
          'Steep valley walls flanking the trough provide natural topographic shielding and wind shelter.',
      },
    ],
  },
  sulfate: {
    nasaId: 'PIA25415',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA25415/PIA25415~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA25415/PIA25415~orig.jpg',
    resolution: '2073 × 1226 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Mosaic',
    sol: 'Sol 3563 (Paraitepuy Pass)',
    caption:
      'Steep sulfate-bearing hills and wind-carved canyons of Mount Sharp’s sulfate transition unit in Paraitepuy Pass.',
    footing: 'Cross-bedded sandstone slabs with eolian sand ripples in pass floor.',
    tool: 'CheMin Drill Core + Mastcam Stereo',
    hotspots: [
      {
        id: 'sf-1',
        x: 35,
        y: 44,
        tag: 'Radiation Shielding',
        label: 'Paraitepuy Pass Cliff Overhang',
        detail:
          'High sulfate butte walls block >38% of isotropic galactic cosmic rays and oblique solar particle flux.',
      },
      {
        id: 'sf-2',
        x: 64,
        y: 66,
        tag: 'Climate Record',
        label: 'Magnesium Sulfate Evaporite Beds',
        detail: 'Salt-enriched strata marking the late Hesperian desiccation of Gale Crater.',
      },
    ],
  },
  'poi-sharp-layers': {
    nasaId: 'PIA19083',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA19083/PIA19083~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA19083/PIA19083~orig.jpg',
    resolution: '1920 × 1080 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam 100mm Telephoto',
    sol: 'Sol 392 (Mount Sharp Buttes & Lower Strata)',
    caption:
      'Exposed clay-to-sulfate transition beds and stratified buttes along the lower flanks of Mount Sharp (Aeolis Mons), recording the drying of ancient Gale Lake.',
    footing: 'Bench-forming sandstone ledges with 9–13° step ramps.',
    tool: 'Rotary Drill + CheMin X-Ray Diffraction',
    hotspots: [
      {
        id: 'msl-1',
        x: 38,
        y: 46,
        tag: 'Stratigraphy',
        label: 'Clay-Sulfate Transition Unconformity',
        detail:
          'Contact zone where phyllosilicate lake clays give way to wind-reworked sulfate evaporites.',
      },
      {
        id: 'msl-2',
        x: 66,
        y: 64,
        tag: 'Shielding',
        label: 'Butte Escarpment Alcove',
        detail:
          'Steep sedimentary cliff face offering natural solar particle shielding along the ascent route.',
      },
    ],
  },
  'poi-sharp-upper': {
    nasaId: 'PIA22313',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA22313/PIA22313~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA22313/PIA22313~orig.jpg',
    resolution: '8000 × 2583 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Uphill Mount Sharp Panorama',
    sol: 'Sol 1931 (Mount Sharp Ascent & Sulfate Bench)',
    caption:
      'Ultra-high-resolution Mastcam panorama looking uphill across the clay-bearing basin toward the towering rhythmic sulfate strata of upper Mount Sharp.',
    footing: 'Hard indurated bedrock shelves with thin eolian sand veneers.',
    tool: 'ChemCam LIBS + Mastcam Stereo',
    hotspots: [
      {
        id: 'msu-1',
        x: 52,
        y: 44,
        tag: 'Paleoclimate',
        label: 'Rhythmic Upper Sulfate Beds',
        detail: 'Cyclic sedimentary layers driven by ancient Martian obliquity variations.',
      },
      {
        id: 'msu-2',
        x: 28,
        y: 64,
        tag: 'Clay Unit',
        label: 'Glen Torridon Phyllosilicate Bench',
        detail: 'Smectite clay-rich trough floor below the sulfate transition scarp.',
      },
    ],
  },
  'poi-bagnold': {
    nasaId: 'PIA19928',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA19928/PIA19928~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA19928/PIA19928~orig.jpg',
    resolution: '5288 × 1703 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Context Panorama',
    sol: 'Sol 1100 (Bagnold Dune Field)',
    caption:
      'Wide Mastcam panorama of dark basaltic windblown sand dunes and fractured sandstone bedrock margin along the Bagnold Dunes corridor in Gale Crater.',
    footing:
      'Skirt the firm bedrock margin; avoid deep unconsolidated leeward dune slipfaces.',
    tool: 'SAM Volatiles Analyzer + Scoop Sample',
    hotspots: [
      {
        id: 'bg-1',
        x: 46,
        y: 58,
        tag: 'Eolian Dynamics',
        label: 'Active Basaltic Dune Crest',
        detail:
          'Olivine- and pyroxene-rich dark sand grains actively migrating under modern Martian winds.',
      },
      {
        id: 'bg-2',
        x: 72,
        y: 68,
        tag: 'Footing',
        label: 'Consolidated Sandstone Trackway',
        detail: 'High-traction bedrock shoulder bypassing loose dune slipfaces.',
      },
    ],
  },
  yellowknife: {
    nasaId: 'PIA16569',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA16569/PIA16569~large.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA16569/PIA16569~orig.jpg',
    resolution: '4977 × 3714 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam 100mm Panorama',
    sol: 'Sol 126 (Yellowknife Bay)',
    caption:
      'Fractured Sheepbed mudstone at Yellowknife Bay crossed by white calcium-sulfate veins—the first confirmed habitable ancient lakebed on Mars.',
    footing: 'Flat, low-angle mudstone pavement (< 3° slope); optimal suited walking speed.',
    tool: 'Rotary Drill + Organic Volatiles Analyzer',
    hotspots: [
      {
        id: 'yk-1',
        x: 48,
        y: 56,
        tag: 'Habitability',
        label: 'Calcium Sulfate (Bassanite) Veins',
        detail:
          'White mineral fractures precipitated from neutral-pH groundwater circulating through lakebed mudstone.',
      },
      {
        id: 'yk-2',
        x: 66,
        y: 44,
        tag: 'Mudstone',
        label: 'Smectite Clay Drill Target',
        detail:
          '~20% phyllosilicate clay content preserving sulfur, nitrogen, hydrogen, oxygen, phosphorus, and carbon.',
      },
    ],
  },
  'poi-yellowknife': {
    nasaId: 'PIA19068',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA19068/PIA19068~large.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA19068/PIA19068~orig.jpg',
    resolution: '3619 × 2196 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam 100mm Stratigraphic Mosaic',
    sol: 'Sol 590 (Gale Crater Fluvial-Lacustrine Beds)',
    caption:
      'Inclined deltaic sandstone and lacustrine mudstone beds in Gale Crater showing ancient water flow toward the Mount Sharp basin.',
    footing: 'Level mudstone and sandstone slabs (< 4° slope); firm suited footing.',
    tool: 'Percussive Drill + CheMin + SAM',
    hotspots: [
      {
        id: 'pyk-1',
        x: 48,
        y: 56,
        tag: 'Astrobiology',
        label: 'Fluvial-Lacustrine Foreset Beds',
        detail:
          'Inclined sedimentary strata deposited by ancient streams entering Gale Lake.',
      },
    ],
  },
  bradbury: {
    nasaId: 'PIA16099',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA16099/PIA16099~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA16099/PIA16099~orig.jpg',
    resolution: '3313 × 1660 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Horizon Panorama',
    sol: 'Sol 19 (Bradbury Landing)',
    caption:
      'High-resolution Mastcam view looking southeast from Bradbury Landing across the pebble-armored plains of Aeolis Palus toward the 5.5 km-high layered peak of Mount Sharp.',
    footing: 'Firm alluvial pebble pavement; ideal habitat base camp and rover staging zone.',
    tool: 'RAD Dosimeter + REMS Weather Boom Check',
    hotspots: [
      {
        id: 'br-1',
        x: 52,
        y: 34,
        tag: 'Horizon Target',
        label: 'Mount Sharp (Aeolis Mons) Ascent Face',
        detail:
          '5.5 km stack of sedimentary layers recording hundreds of millions of years of Martian environmental history.',
      },
      {
        id: 'br-2',
        x: 38,
        y: 72,
        tag: 'Alluvial Fan',
        label: 'Peace Vallis Stream Cobbles',
        detail:
          'Rounded fluvial gravel conglomerate transported by ancient ankle-to-hip-deep streams.',
      },
    ],
  },
  gale: {
    nasaId: 'PIA26671',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA26671/PIA26671~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA26671/PIA26671~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA26671/PIA26671~medium.jpg',
    resolution: '4000 × 1265 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'Mastcam Gale Crater Rim Panorama',
    sol: 'Sol 4102 (Gale Crater / Peace Vallis View)',
    caption:
      'Wide Mastcam panorama looking across the Gale Crater basin floor toward the northern crater rim and the ancient Peace Vallis river channel.',
    footing: 'Firm pebble-armored alluvial plain; nominal suited walking terrain.',
    tool: 'RAD Dosimeter + Mastcam Context Survey',
    hotspots: [
      {
        id: 'gl-1',
        x: 52,
        y: 34,
        tag: 'Crater Rim',
        label: 'Gale Crater Northern Wall & Peace Vallis',
        detail: 'Ancient impact rim and fluvial valley that fed Lake Gale billions of years ago.',
      },
    ],
  },
  'poi-rems': {
    nasaId: 'PIA22209',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA22209/PIA22209~large.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA22209/PIA22209~large.jpg',
    resolution: '1920 × 925 px',
    mission: 'Curiosity Rover (MSL)',
    camera: 'REMS + Mastcam Basin Vista',
    sol: 'Sol 1866 (Gale Crater Basin Overlook)',
    caption:
      'Wide Mastcam vista across the Gale Crater floor and northern rim wall where the Rover Environmental Monitoring Station (REMS) tracks katabatic slope winds, pressure tides, and UV flux.',
    footing: 'Level bedrock pavement; clear horizon for meteorological sensor calibration.',
    tool: 'REMS Barometer + UV Photodiode Array',
    hotspots: [
      {
        id: 'rm-1',
        x: 50,
        y: 38,
        tag: 'Meteorology',
        label: 'Katabatic Slope Wind Corridor',
        detail:
          'Downslope nighttime thermal winds draining off Mount Sharp into the Aeolis Palus basin.',
      },
    ],
  },
  delta: {
    nasaId: 'PIA24813',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24813/PIA24813~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA24813/PIA24813~orig.jpg',
    resolution: '2555 × 1833 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z 110mm Zoom Panorama',
    sol: 'Sol 190 (Jezero Western Delta Scarp)',
    caption:
      'Eye-level Mastcam-Z panorama of the steep 40-meter-high Jezero Crater river delta front ("Scarp A"), exposing tilted foreset lakebeds and ancient flood boulder conglomerates.',
    footing: '10–16° talus apron ramping up to flat sedimentary benches.',
    tool: 'Coring Drill + SHERLOC Deep-UV Raman',
    hotspots: [
      {
        id: 'jd-1',
        x: 44,
        y: 48,
        tag: 'Biosignatures',
        label: 'Prodelta Finely Laminated Mudstone',
        detail:
          'Low-energy bottomset lakebeds rich in iron-magnesium clays and aromatic organic rings.',
      },
      {
        id: 'jd-2',
        x: 68,
        y: 35,
        tag: 'Flood Boulders',
        label: 'Upper Delta Conglomerate Cap',
        detail:
          'Coarse boulder beds deposited by late-stage high-energy flash floods into Lake Jezero.',
      },
    ],
  },
  'poi-delta': {
    nasaId: 'PIA24684',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24684/PIA24684~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA24684/PIA24684~orig.jpg',
    resolution: '2991 × 2111 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z + RMI Telephoto Mosaic',
    sol: 'Sol 115 (Jezero Delta Escarpment)',
    caption:
      'High-resolution Mastcam-Z mosaic of the stratified river delta front in western Jezero Crater preserving ancient Gilbert-type delta foreset beds and flood boulders.',
    footing: 'Stepped sandstone ledges flanked by talus slopes.',
    tool: 'Rotary Coring Drill + PIXL + SHERLOC',
    hotspots: [
      {
        id: 'pjd-1',
        x: 46,
        y: 48,
        tag: 'Lacustrine',
        label: 'Delta Foreset & Bottomset Beds',
        detail:
          'Inclined sedimentary layers marking the ancient shoreline and water depth of Lake Jezero.',
      },
    ],
  },
  'poi-clay': {
    nasaId: 'PIA25911',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA25911/PIA25911~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA25911/PIA25911~orig.jpg',
    resolution: '4345 × 2113 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z Stereo Mosaic',
    sol: 'Sol 708 (Jezero Delta / Franklin Cliffs)',
    caption:
      'High-resolution Mastcam-Z panorama of finely stratified sedimentary layers at the Jezero delta front—prime target for Mars Sample Return.',
    footing: 'Low-relief fractured sedimentary bench with fine sulfate veins.',
    tool: 'Abrasion Patch + SHERLOC + Sample Tube',
    hotspots: [
      {
        id: 'pcl-1',
        x: 52,
        y: 54,
        tag: 'Astrobiology',
        label: 'Fe/Mg Smectite Mudstone Bench',
        detail: 'Quiet-water lakebed sediment with high biosignature preservation potential.',
      },
    ],
  },
  neretva: {
    nasaId: 'PIA26369',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA26369/PIA26369~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA26369/PIA26369~orig.jpg',
    resolution: '5400 × 1320 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z 360° Channel Panorama',
    sol: 'Sol 1185 (Neretva Vallis / Bright Angel)',
    caption:
      'Authentic 360-degree Mastcam-Z panorama inside the Neretva Vallis inflow channel at the "Bright Angel" light-toned outcrop, where Perseverance discovered organic carbon alongside millimeter-scale "leopard spot" redox reaction fronts.',
    footing:
      'Channel-floor fractured mudstone slabs bordered by low carbonate terraces.',
    tool: 'PIXL X-Ray Fluorescence + SHERLOC UV',
    hotspots: [
      {
        id: 'nv-1',
        x: 56,
        y: 62,
        tag: 'Potential Biosignature',
        label: 'Bright Angel / Cheyava Falls Outcrop',
        detail:
          'Light-toned mudstone hosting dark iron-phosphate (vivianite) and iron-sulfide (greigite) reaction halos around reduced redox centers.',
      },
      {
        id: 'nv-2',
        x: 30,
        y: 46,
        tag: 'Inflow Channel',
        label: 'Neretva Vallis Channel Bank',
        detail:
          'Northern bank of the ancient river valley providing natural 28% terrain shielding.',
      },
    ],
  },
  'poi-neretva': {
    nasaId: 'PIA26336',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA26336/PIA26336~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA26336/PIA26336~orig.jpg',
    resolution: '2557 × 790 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z Channel Survey',
    sol: 'Sol 1180 (Neretva Vallis Channel)',
    caption:
      'Ancient river channel carved through the western rim of Jezero Crater exposing the light-toned Bright Angel formation along the Neretva Vallis floor.',
    footing: 'Fluvial cobble and light-toned Bright Angel mudstone exposures.',
    tool: 'SuperCam LIBS + RIMFAX Ground Radar',
    hotspots: [
      {
        id: 'pnv-1',
        x: 54,
        y: 58,
        tag: 'Fluvial',
        label: 'Bright Angel Light-Toned Outcrop',
        detail:
          'Sulfur- and organic-bearing mudstone exposed along the Neretva Vallis floor.',
      },
    ],
  },
  'poi-cheyava': {
    nasaId: 'PIA26372',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA26372/PIA26372~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA26372/PIA26372~orig.jpg',
    resolution: '2560 × 1920 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Navcam Full-Frame Surface View',
    sol: 'Sol 1221 (Bright Angel / Cheyava Falls Site)',
    caption:
      'Full-frame Perseverance navigation camera view looking across the Bright Angel exposure in Neretva Vallis where the Cheyava Falls core sample was collected.',
    footing: 'Gentle 5° channel floor; minimal boulder obstruction.',
    tool: 'Core Sample Tube + PIXL Micro-XRF',
    hotspots: [
      {
        id: 'cf-1',
        x: 55,
        y: 60,
        tag: 'Astrobiology',
        label: 'Redox Reaction Fronts ("Leopard Spots")',
        detail:
          'Co-located organic carbon, calcium sulfate veins, and Fe-phosphate/sulfide rims.',
      },
    ],
  },
  'poi-seitah': {
    nasaId: 'PIA25075',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA25075/PIA25075~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA25075/PIA25075~orig.jpg',
    resolution: '2015 × 1077 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z Stereo',
    sol: 'Sol 68–204 (Jezero Floor & Séítah Margin)',
    caption:
      'Olivine-bearing igneous bedrock outcrops and boulder-strewn ridges bordering the Séítah geologic unit on the Jezero Crater floor.',
    footing: 'Coarse sand ripples flanking 9° dipping igneous ledges.',
    tool: 'PIXL + Abrasion Bit',
    hotspots: [
      {
        id: 'st-1',
        x: 52,
        y: 50,
        tag: 'Igneous Cumulate',
        label: 'Olivine & Pyroxene Bedrock',
        detail:
          'Ancient magma-chamber or thick lava-lake cumulate later carbonated by lake water.',
      },
    ],
  },
  'poi-carbonates': {
    nasaId: 'PIA25889',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA25889/PIA25889~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA25889/PIA25889~orig.jpg',
    resolution: '9000 × 1191 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z Ultra-Wide Panorama',
    sol: 'Sol 772 (Belva Crater & Margin Carbonate Unit)',
    caption:
      '9000-pixel Mastcam-Z panorama of dipping shoreline and deltaic strata exposed inside Belva Crater near the inner carbonate margin of Jezero Crater.',
    footing: 'Blocky carbonate-cemented sandstone benches; 8–12° local slope.',
    tool: 'PIXL + SHERLOC + Core Drill',
    hotspots: [
      {
        id: 'pcb-1',
        x: 50,
        y: 52,
        tag: 'Paleolake Shoreline',
        label: 'Authigenic Magnesium Carbonate & Dipping Beds',
        detail:
          'Carbonate-bearing strata deposited in shallow nearshore waters of ancient Lake Jezero.',
      },
    ],
  },
  butler: {
    nasaId: 'PIA24483',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24483/PIA24483~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA24483/PIA24483~orig.jpg',
    resolution: '1920 × 1080 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Navcam 360° Horizon',
    sol: 'Sol 14 (Octavia E. Butler Landing)',
    caption:
      'Flat volcanic crater floor at Octavia E. Butler Landing in Jezero Crater, with the ancient river delta escarpment visible 2.2 km to the northwest.',
    footing:
      'Level fractured Máaz basaltic floor (< 2.5° slope); primary habitat & sample depot zone.',
    tool: 'MOXIE O₂ Plant Check + MEDA Weather Calibration',
    hotspots: [
      {
        id: 'ob-1',
        x: 45,
        y: 36,
        tag: 'Delta Horizon',
        label: 'Jezero Delta Escarpment (2.2 km NW)',
        detail: 'Primary EVA destination visible on the northwest horizon.',
      },
      {
        id: 'ob-2',
        x: 62,
        y: 68,
        tag: 'Sample Depot',
        label: 'Firm Basaltic Regolith',
        detail:
          'High bearing-strength surface suited for pressurized rover parking and sample caching.',
      },
    ],
  },
  jezero: {
    nasaId: 'PIA25172',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA25172/PIA25172~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA25172/PIA25172~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA25172/PIA25172~medium.jpg',
    resolution: '3600 × 1142 px',
    mission: 'Perseverance Rover (Mars 2020)',
    camera: 'Mastcam-Z 360° Basin Panorama',
    sol: 'Sol 414 (Jezero Crater / Santa Cruz Horizon)',
    caption:
      'Mastcam-Z panorama across the Jezero Crater floor looking toward the Santa Cruz hill and the ancient lake basin rim.',
    footing: 'Level volcanic floor; high bearing strength for rover and crew traverse.',
    tool: 'MEDA Weather Boom + RIMFAX Radar',
    hotspots: [
      {
        id: 'jz-1',
        x: 45,
        y: 36,
        tag: 'Basin Remnant',
        label: 'Santa Cruz Butte & Jezero Rim',
        detail: 'Eroded sedimentary and volcanic remnant inside the 45 km Jezero impact basin.',
      },
    ],
  },
  'poi-nili-troughs': {
    nasaId: 'PIA24814',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24814/PIA24814~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA24814/PIA24814~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA24814/PIA24814~medium.jpg',
    resolution: '3840 × 1546 px',
    mission: 'Perseverance / MRO Recon',
    camera: 'Mastcam-Z Telephoto Scarp Mosaic',
    sol: 'Jezero / Nili Fossae Rim Corridor',
    caption:
      'Steep faulted scarps and ancient Noachian megabreccia blocks exposed along the western Jezero / Nili Fossae structural margin.',
    footing: 'Fractured bedrock pavement with bounding scarps.',
    tool: 'CRISM Spectral Check + Core Drill',
    hotspots: [
      {
        id: 'nf-1',
        x: 48,
        y: 42,
        tag: 'Tectonics',
        label: 'Olivine-Carbonate Ridge Wall',
        detail: 'Noachian crust and phyllosilicate-bearing rock unit.',
      },
    ],
  },
  shelter: {
    nasaId: 'PIA20765',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA20765/PIA20765~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA20765/PIA20765~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA20765/PIA20765~medium.jpg',
    resolution: '4200 × 1245 px',
    mission: 'Curiosity / MRO HiRISE Recon',
    camera: 'Mastcam Butte Alcove Panorama',
    sol: 'Emergency Radiation Shelter Protocol',
    caption:
      'Steep sandstone cliff alcove and overhang wall at the Murray Buttes corridor, selected by MOLA horizon-angle analysis to block oblique solar proton flux.',
    footing: 'Sheltered bedrock recess at base of steep scarp; stable regolith floor.',
    tool: 'Personal Dosimeter Check + Deployable Regolith Blanket',
    hotspots: [
      {
        id: 'sh-1',
        x: 36,
        y: 42,
        tag: 'Radiation Shield',
        label: 'High-Angle Bedrock Escarpment',
        detail:
          'Thick rock mass blocks primary Solar Energetic Particles (SEPs) and reduces secondary neutron scatter.',
      },
      {
        id: 'sh-2',
        x: 54,
        y: 70,
        tag: 'Crew Position',
        label: 'Protected Alcove Trench',
        detail:
          'Crew crouches within 1.5 m of the scarp base until DONKI proton flux drops below alert threshold.',
      },
    ],
  },
  'spirit-gusev': {
    nasaId: 'PIA03253',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA03253/PIA03253~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA03253/PIA03253~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA03253/PIA03253~medium.jpg',
    resolution: '2880 × 1440 px',
    mission: 'Spirit Rover (MER-A)',
    camera: 'Pancam 360° Summit Panorama',
    sol: 'Sol 582 (Gusev Crater / Husband Hill)',
    caption:
      'Authentic Pancam panorama from the summit ridge of Husband Hill inside Gusev Crater, showing basaltic boulder fields and hydrothermal silica-rich soils.',
    footing: 'Basaltic cobble and wind-scoured volcanic ridge.',
    tool: 'Pancam + Mossbauer + APXS',
    hotspots: [],
  },
  'opportunity-meridiani': {
    nasaId: 'PIA08812',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA08812/PIA08812~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA08812/PIA08812~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA08812/PIA08812~orig.jpg',
    resolution: '2640 × 1120 px',
    mission: 'Opportunity Rover (MER-B)',
    camera: 'Pancam Duck Bay Overlook',
    sol: 'Sol 952 (Meridiani Planum / Victoria Crater)',
    caption:
      'Opportunity Pancam view from Duck Bay overlooking the scalloped sandstone promontories of Victoria Crater on the hematite-rich plains of Meridiani Planum.',
    footing: 'Hematite-spherule pavement bordering steep eolian sandstone cliffs.',
    tool: 'Pancam + Microscopic Imager + RAT',
    hotspots: [],
  },
  'viking1-chryse': {
    nasaId: 'PIA03165',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA03165/PIA03165~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA03165/PIA03165~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA03165/PIA03165~medium.jpg',
    resolution: '3912 × 992 px',
    mission: 'Viking 1 Lander',
    camera: 'Viking Lander Camera 1 Mosaic',
    sol: 'Sol 12 (Chryse Planitia)',
    caption:
      'Historic afternoon surface mosaic on Chryse Planitia captured by Viking Lander 1, showing wind-drifted regolith dunes and volcanic boulders ("Big Joe").',
    footing: 'Fine drift sand interspersed with vesicular basalt blocks.',
    tool: 'Surface Sampler Arm + GCMS + XRFS',
    hotspots: [],
  },
  'viking2-utopia': {
    nasaId: 'PIA04023',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA04023/PIA04023~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA04023/PIA04023~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA04023/PIA04023~orig.jpg',
    resolution: '2048 × 1536 px',
    mission: 'Viking 2 Lander',
    camera: 'Viking Lander Facsimile Camera',
    sol: 'Utopia Planitia Landing Site',
    caption:
      'Angular vesicular basalt boulders and shallow seasonal water-ice frost troughs across the northern plains of Utopia Planitia.',
    footing: 'Dense boulder field over cemented duricrust soil.',
    tool: 'Surface Sampler + Meteorology Boom + Seismometer',
    hotspots: [],
  },
  'pathfinder-ares': {
    nasaId: 'PIA00995',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA00995/PIA00995~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA00995/PIA00995~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA00995/PIA00995~orig.jpg',
    resolution: '1536 × 960 px',
    mission: 'Mars Pathfinder & Sojourner',
    camera: 'Imager for Mars Pathfinder (IMP)',
    sol: 'Sol 4 (Ares Vallis / Twin Peaks)',
    caption:
      'IMP camera view across the catastrophic flood-imbricated boulder field of Ares Vallis toward the Twin Peaks hills 1 km on the horizon.',
    footing: 'Flood-deposited cobbles and boulders; moderate rover obstacle density.',
    tool: 'IMP Stereo Camera + Sojourner APXS',
    hotspots: [],
  },
  'phoenix-arctic': {
    nasaId: 'PIA10732',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA10732/PIA10732~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA10732/PIA10732~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA10732/PIA10732~orig.jpg',
    resolution: '2048 × 1024 px',
    mission: 'Phoenix Mars Lander',
    camera: 'Surface Stereo Imager (SSI)',
    sol: 'Sol 3 (Vastitas Borealis / Green Valley)',
    caption:
      'Polygonal permafrost troughs on the northern arctic plains of Vastitas Borealis where Phoenix excavated shallow subsurface water ice.',
    footing: 'Polygonal patterned ground underlain by hard water-ice table at 5 cm depth.',
    tool: 'Robotic Arm Scoop + TEGA + MECA',
    hotspots: [],
  },
  'insight-elysium': {
    nasaId: 'PIA22952',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA22952/PIA22952~orig.jpg',
    fullResUrl: 'https://images-assets.nasa.gov/image/PIA22952/PIA22952~orig.jpg',
    thumbUrl: 'https://images-assets.nasa.gov/image/PIA22952/PIA22952~medium.jpg',
    resolution: '2048 × 1536 px',
    mission: 'InSight Lander',
    camera: 'Instrument Deployment Camera (IDC)',
    sol: 'Sol 25 (Elysium Planitia / Homestead Hollow)',
    caption:
      'InSight lander workspace inside Homestead Hollow on Elysium Planitia with the copper-colored SEIS seismometer deployed directly onto the Martian regolith.',
    footing: 'Smooth regolith-filled impact hollow with low boulder abundance.',
    tool: 'SEIS Seismometer + HP3 Heat Probe + TWINS',
    hotspots: [],
  },
}

/**
 * Generates an SVG data-URI Martian surface horizon fallback if offline.
 */
export function buildHorizonFallbackSvg(stop) {
  const title = (stop?.title || 'Martian Surface Waypoint').replace(/[<>&"]/g, '')
  const sub = `${stop?.terrain || 'Bedrock'} · Elev ${stop?.elevKm ?? -3.8} km · Slope ${stop?.slopeDeg ?? 6}°`
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2c140c"/>
        <stop offset="55%" stop-color="#6e331c"/>
        <stop offset="100%" stop-color="#b55b33"/>
      </linearGradient>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7c361c"/>
        <stop offset="100%" stop-color="#281008"/>
      </linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#sky)"/>
    <circle cx="510" cy="78" r="24" fill="#ffd2a6" opacity="0.55"/>
    <polygon points="0,210 95,162 210,188 335,134 460,175 565,142 640,168 640,360 0,360" fill="#4f2211" opacity="0.85"/>
    <polygon points="0,235 140,198 280,224 420,182 555,215 640,196 640,360 0,360" fill="url(#ground)"/>
    <g stroke="#ff9d6e" stroke-opacity="0.22" stroke-width="1">
      <line x1="0" y1="265" x2="640" y2="265"/>
      <line x1="0" y1="305" x2="640" y2="305"/>
      <line x1="320" y1="180" x2="320" y2="360"/>
    </g>
    <text x="24" y="318" fill="#ffffff" font-family="monospace" font-size="15" font-weight="bold">${title}</text>
    <text x="24" y="340" fill="#f5a524" font-family="monospace" font-size="12">${sub}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const MISSION_POV_MAP = {
  curiosity: 'boxwork',
  perseverance: 'delta',
  spirit: 'spirit-gusev',
  opportunity: 'opportunity-meridiani',
  viking1: 'viking1-chryse',
  viking2: 'viking2-utopia',
  pathfinder: 'pathfinder-ares',
  phoenix: 'phoenix-arctic',
  insight: 'insight-elysium',
}

export function getPovForStop(stop) {
  if (!stop) return POV_CATALOG.boxwork
  if (stop.id && POV_CATALOG[stop.id]) return POV_CATALOG[stop.id]
  if (stop.id && MISSION_POV_MAP[stop.id]) return POV_CATALOG[MISSION_POV_MAP[stop.id]]
  if (stop.kind === 'shelter') {
    const isJezero = stop.lat > 14 && stop.lat < 23 && stop.lon > 70 && stop.lon < 82
    return isJezero ? POV_CATALOG['poi-delta'] : POV_CATALOG.shelter
  }

  // Match by proximity / region (Gale Crater vs Jezero Crater)
  const isGale = stop.lat < 0 && stop.lat > -10 && stop.lon > 130 && stop.lon < 145
  const isJezero = stop.lat > 14 && stop.lat < 23 && stop.lon > 70 && stop.lon < 82

  if (isGale) {
    if (/boxwork/i.test(stop.title)) return POV_CATALOG.boxwork
    if (/gediz|sulfur/i.test(stop.title)) return POV_CATALOG.gediz
    if (/marker|ripple/i.test(stop.title)) return POV_CATALOG['poi-marker-band']
    if (/sulfate|sharp/i.test(stop.title)) return POV_CATALOG.sulfate
    if (/bagnold|dune/i.test(stop.title)) return POV_CATALOG['poi-bagnold']
    if (/yellowknife|lake/i.test(stop.title)) return POV_CATALOG.yellowknife
    return POV_CATALOG.bradbury
  }

  if (isJezero) {
    if (/neretva|cheyava|bright/i.test(stop.title)) return POV_CATALOG.neretva
    if (/seitah|olivine|carbonate/i.test(stop.title)) return POV_CATALOG['poi-seitah']
    if (/butler|landing/i.test(stop.title)) return POV_CATALOG.butler
    return POV_CATALOG.delta
  }

  return POV_CATALOG.boxwork
}

/**
 * Builds the ordered list of Surface Reconnaissance Stops along a planned route:
 * Start -> Science Stops & Key Waypoints -> Topographic Radiation Shelter -> Destination.
 */
export function buildRouteReconStops(route) {
  if (!route || !route.points?.length) return []

  const firstPt = route.points[0]
  const lastPt = route.points[route.points.length - 1]
  const list = []

  // 1. Start location
  const startStop = {
    key: `start-${route.start.id}`,
    id: route.start.id,
    kind: 'start',
    badge: 'START / HAB',
    title: route.start.name,
    km: 0,
    lat: route.start.lat,
    lon: route.start.lon,
    elevKm: firstPt.elevKm,
    slopeDeg: firstPt.slopeDeg,
    tempC: firstPt.tempC,
    terrain: firstPt.terrain,
  }
  startStop.pov = getPovForStop(startStop)
  list.push(startStop)

  // 2. Science stops along the route
  for (const s of route.stops || []) {
    const nearPt = route.points.reduce(
      (a, b) => (Math.abs(b.km - s.km) < Math.abs(a.km - s.km) ? b : a),
      firstPt
    )
    const item = {
      key: `stop-${s.id}`,
      id: s.id,
      kind: 'stop',
      badge: s.category ? `SCIENCE · ${s.category.toUpperCase()}` : 'SCIENCE STOP',
      title: s.title,
      km: s.km,
      lat: s.lat,
      lon: s.lon,
      elevKm: s.elevKm ?? nearPt.elevKm,
      slopeDeg: nearPt.slopeDeg,
      tempC: nearPt.tempC,
      terrain: nearPt.terrain,
      note: s.detail,
      source: s.source,
    }
    item.pov = getPovForStop(item)
    list.push(item)
  }

  // 3. Natural Topographic Radiation Shelter
  if (route.shelterPoint) {
    const sh = route.shelterPoint
    const nearPt = route.points.reduce(
      (a, b) => (Math.abs(b.km - sh.km) < Math.abs(a.km - sh.km) ? b : a),
      firstPt
    )
    const shelterItem = {
      key: 'shelter-point',
      id: 'shelter',
      kind: 'shelter',
      badge: `SHELTER (-${sh.shieldingPct}% DOSE)`,
      title: `Radiation Shelter (${sh.feature})`,
      km: sh.km,
      lat: sh.lat,
      lon: sh.lon,
      elevKm: sh.elevKm,
      slopeDeg: sh.slopeDeg,
      tempC: nearPt.tempC,
      terrain: sh.terrain,
      note: `Blocks ~${sh.shieldingPct}% horizon sky angle against Solar Energetic Particles.`,
    }
    shelterItem.pov = getPovForStop(shelterItem)
    list.push(shelterItem)
  }

  // 4. Destination
  const endStop = {
    key: `end-${route.end.id}`,
    id: route.end.id,
    kind: 'end',
    badge: 'DESTINATION TARGET',
    title: route.end.name,
    km: route.distanceKm,
    lat: route.end.lat,
    lon: route.end.lon,
    elevKm: lastPt.elevKm,
    slopeDeg: lastPt.slopeDeg,
    tempC: lastPt.tempC,
    terrain: lastPt.terrain,
  }
  endStop.pov = getPovForStop(endStop)
  list.push(endStop)

  // Sort in travel order (Start at 0, intermediate stops sorted by km, Destination last)
  const middle = list.slice(1, -1).sort((a, b) => a.km - b.km)
  return [list[0], ...middle, list[list.length - 1]]
}
