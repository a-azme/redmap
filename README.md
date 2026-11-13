# RedMap: Interplanetary Survival Guide

<div align="center">
  <img src="public/favicon.svg" alt="RedMap Logo" width="120" />
  <h3>The Ultimate Martian Mapping and EVA Routing Tool for Future Astronauts</h3>
  
  [![NASA Space Apps 2026](https://img.shields.io/badge/NASA_Space_Apps-2026-0b3d91?style=for-the-badge&logo=nasa)](https://www.spaceappschallenge.org/) 
[![React](https://img.shields.io/badge/React-18.2.0-61dafb?style=for-the-badge&logo=react&logoColor=black)]() 
[![CesiumJS](https://img.shields.io/badge/Cesium-3D_Globe-47A042?style=for-the-badge&logo=cesium&logoColor=white)]() 
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)]() 
[![License: MIT](https://img.shields.io/badge/License-MIT-F2C811?style=for-the-badge)](https://opensource.org/licenses/MIT)
</div>

<br/>

<div align="center">
  <h2>Live Demo</h2>
  <p>
    <b>RedMap: </b> <a href="https://redmap-iota.vercel.app">https://redmap-iota.vercel.app</a>
  </p>
  <p>
    <i>(NB: We highly recommend viewing the application on a desktop browser for the best 3D geospatial rendering experience.)</i>
  </p>
</div>

---

## The Challenge

NASA has spent decades mapping Mars. However, when the first astronauts set foot on the Red Planet, they won't just need static images—they will need an **integrated, layered survival map**. 

We built **RedMap** to solve the **"Interplanetary Survival Guide: Martian Map"** challenge. RedMap is a highly interactive, 3D/2D planetary mapping tool that pulls together data from multiple NASA science missions to help astronauts plan safe, scientifically valuable Extravehicular Activities (EVAs).

---

## Key Features

- **Layered Planetary Visualization:** Seamlessly switch between True Color Terrain, Topographic Elevation, Mineral Composition, and Temperature layers using a custom 3D Mars globe powered by CesiumJS.
- **Smart EVA Pathfinding:** Click a start and end destination to calculate the optimal route. Our custom **A* Pathfinding Algorithm** calculates terrain difficulty, avoiding steep slopes (e.g., >15 degrees) and hazardous boulder fields.
- **Astronaut Safety Dashboard:** Instantly view trip distance, required sols (days) to complete, elevation profiles, estimated radiation exposure, and extreme temperature warnings.
- **Science Stop Suggestions:** The routing engine automatically suggests detours to nearby Points of Interest (POIs) like clay outcrops, ancient deltas, or fresh impact craters.
- **Mission Context:** Explore historical NASA landers, rovers, and orbiters. View data gathered by Perseverance, Curiosity, and MRO directly on the map.

---

## How We Used NASA Data

Scientific validity is at the core of RedMap. We utilized the **NASA Mars Trek WMTS API** and historical mission data to overlay actual planetary conditions onto our custom 3D ellipsoid geometry:

| Mission | Instrument / Sensor | Dataset Product | Operational Application in RedMap |
| :--- | :--- | :--- | :--- |
| **Mars Global Surveyor (MGS)** | **MOLA** + MEX **HRSC** | Blended Color Shaded Relief (`clon0dd_200mpp`) | Global base elevation mapping; regional contour and slope calculation for the A* routing algorithm. |
| **Mars Reconnaissance Orbiter (MRO)** | **HiRISE** | High-Resolution Orthomosaic (`JEZ_hirise_soc_006`) | Meter-scale rock, crevasse, and hazard detection visualization inside Jezero Crater. |
| **Mars Reconnaissance Orbiter (MRO)** | **CTX** | Jezero Controlled Mosaic (`Jezero_CTX_BlockAdj_dd`) | Regional morphologic context and terrain boundary definitions. |
| **2001 Mars Odyssey** | **THEMIS** | Daytime Infrared Controlled Mosaic (`DayIR_100m_v2`) | Thermal inertia identification; estimating surface temperatures to generate extreme cold hazard warnings. |
| **Mars Global Surveyor (MGS)** | **TES** | Glass & Sheet Silicates Mosaic (`TES_Glass_Clay`) | Identification of clay, phyllosilicate, and aqueous alteration zones for "Science Stop" suggestions. |
| **Mars Global Surveyor (MGS)** | **TES** | Atmospheric Dust Dispersion (`TES_Dust`) | Atmospheric visualization layer to assess potential dust storm opacity hazards. |
| **Viking Orbiter 1 & 2** | **VIS** | Viking MDIM 2.1 Color Mosaic (`MDIM21_ClrMosaic`) | True natural-color planetary baseline and base texture for the 3D globe. |
| **Mars Science Laboratory (MSL)** | **RAD** (Radiation Assessment) | Empirical Surface Dosimetry | Radiation hazard modeling applied to EVA route duration ($~0.64\text{ mSv/Sol}$ baseline). |

---

## Technology Stack

RedMap is built for performance and scientific accuracy in the browser:

- **Frontend Framework:** React.js + Vite for lightning-fast HMR and optimized builds.
- **Styling:** Tailwind CSS for a sleek, responsive, aerospace-grade UI.
- **State Management:** Zustand for lightweight, fast state sharing across map components and routing panels.
- **Geospatial Engine:** CesiumJS configured specifically for the Martian Ellipsoid (`Cesium.Ellipsoid.MARS`), ensuring accurate coordinate projection and distance calculations.
- **Pathfinding:** Custom MinHeap A* algorithm (`lib/pathfinding.js`) applying heuristic slope-weight penalties based on terrain data.

---

## Run RedMap Locally

Want to explore Mars on your own machine? Follow these steps:

### Prerequisites

- Node.js (v18 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/a-azme/redmap.git
   cd redmap
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Explore Mars**
   Open your browser and navigate to `http://localhost:5173`

*(Don't want to install? <a href="https://redmap-iota.vercel.app">Test Here</a>).*

---

## Future Roadmap

While RedMap is fully functional, we are continually planning future upgrades for the next generation of Martian explorers:

- [ ] **Web Worker Integration:** Offload the A* pathfinding algorithm to a Web Worker to prevent UI blocking during massive trans-continental route calculations.
- [ ] **GeoTIFF Parsing:** Direct client-side parsing of raw NASA GeoTIFF elevation files for pixel-perfect millimeter-level pathfinding.
- [ ] **Live Space Weather:** Integrate the Mars Weather Service API (from Perseverance/InSight) for live atmospheric pressure and solar flare warnings.

---

## The Team

We are **Team Red Matter**, a group of passionate developers, designers, and space enthusiasts participating in the NASA Space Apps Challenge 2026.

| Team Member | Role & Contribution |
| :--- | :--- |
| **Abdullahil Azme** | Team Leader, Storyteller & Video Editor |
| **Ashraful Islam Sakib** | Lead Coder & Web Developer |
| **Md. Tahsin Fuad Nabil** | AI/Data Engineer |
| **Humaiyara Reza Ridita** | Researcher |
| **Md. Hasimuzzaman** | UI/UX Designer |

---

## Acknowledgments & Credits

- **NASA & JPL:** All planetary data, imagery mosaics, elevation profiles, and orbital layers are courtesy of NASA, JPL-Caltech, USGS, and the NASA Mars Trek API.
- **AI Assistance:** We utilized AI tools during the hackathon to assist with rapid brainstorming, code debugging, and architectural review, allowing us to focus on the science and user experience.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 

<div align="center">
  <br>
  <br>
  <br>
  Built by Team Red Matter for the NASA Space Apps Challenge 2026.
</div>