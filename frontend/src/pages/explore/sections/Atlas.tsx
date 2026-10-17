import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { useEffect, useRef, useState } from 'react'
import { STATE_COORDS, STATES } from '../data/states'

// Bundled builds lose Leaflet's auto-detected default marker image path.
const markerIconDefault = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})

type PanelState = { kind: 'prompt' } | { kind: 'empty' } | { kind: 'state'; name: string }

export function Atlas() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [panel, setPanel] = useState<PanelState>({ kind: 'prompt' })

  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const map = L.map(el, { scrollWheelZoom: false }).setView([22.5, 79], 4.7)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    Object.keys(STATES).forEach((name) => {
      const coords = STATE_COORDS[name]
      if (!coords) return
      L.marker(coords, { icon: markerIconDefault })
        .addTo(map)
        .bindTooltip(name)
        .on('click', () => setPanel({ kind: 'state', name }))
    })
    // The map may mount before layout settles (fonts, reveal transitions).
    const t = window.setTimeout(() => map.invalidateSize(), 300)
    return () => {
      window.clearTimeout(t)
      map.remove()
    }
  }, [])

  const state = panel.kind === 'state' ? STATES[panel.name] : null

  return (
    <section className="section map-section atlas-pro" id="atlas">
      <div className="atlas-head">
        <div>
          <div className="eyebrow" style={{ color: '#6b3030' }}>
            01 — The living atlas
          </div>
          <h2>
            One subcontinent.
            <br />
            <em>Thousands of stories.</em>
          </h2>
          <p className="section-intro">
            Move across a historical-cultural map of the Indian subcontinent. Explore places, languages, routes and
            heritage that connect communities across centuries.
          </p>
        </div>
        <div className="atlas-stats">
          <span>
            <b>30+</b>
            <small>regions</small>
          </span>
          <span>
            <b>1000s</b>
            <small>stories</small>
          </span>
          <span>
            <b>5,000+</b>
            <small>years</small>
          </span>
        </div>
      </div>
      <div className="atlas-map-shell">
        <div id="miravaIndiaMap" className="atlas-leaflet-map" ref={mapRef}></div>
        <div className="atlas-side-panel" id="miravaStatePanel">
          {panel.kind === 'prompt' && (
            <>
              <div className="atlas-prompt">
                <span>✦</span>
                <small>EXPLORE THE MAP</small>
                <h3>Pick a region</h3>
                <p>Click a marker to reveal its living heritage — places, languages, food, festivals and stories.</p>
              </div>
              <div className="atlas-legend">
                <span>
                  <i className="legend-dot"></i> Living heritage
                </span>
                <span>
                  <i className="legend-dot historical"></i> Historical-cultural route
                </span>
              </div>
            </>
          )}
          {panel.kind === 'empty' && (
            <div className="empty">
              <div className="icon">🗺️</div>
              <h3>Select a region</h3>
              <p>Click on a state or union territory on the map to explore its living heritage.</p>
            </div>
          )}
          {panel.kind === 'state' && state && (
            <div className="mir-state-profile" key={panel.name}>
              <button
                type="button"
                id="miravaStatePanelClose"
                aria-label="Close"
                onClick={() => setPanel({ kind: 'empty' })}
                style={{
                  float: 'right',
                  background: 'transparent',
                  border: '1px solid rgba(38,22,26,.18)',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  fontSize: 16,
                  color: '#624950',
                  marginBottom: 8,
                }}
              >
                ×
              </button>
              <img src={state.image} alt={panel.name} className="mir-state-img" loading="lazy" />
              <span className="mir-card-tag">Living Heritage</span>
              <h3>{panel.name}</h3>
              <p className="overview">
                Discover the living heritage of {panel.name} — its capital, languages, cuisine, festivals, arts and
                iconic heritage sites.
              </p>
              <div className="mir-state-fields">
                <div>
                  <b>Capital</b>
                  <span>{state.capital}</span>
                </div>
                <div>
                  <b>Languages</b>
                  <span>{state.languages}</span>
                </div>
                <div>
                  <b>Cuisine</b>
                  <span>{state.cuisine}</span>
                </div>
                <div>
                  <b>Festivals</b>
                  <span>{state.festivals}</span>
                </div>
                <div className="wide">
                  <b>Arts &amp; Crafts</b>
                  <span>{state.arts}</span>
                </div>
                <div className="wide">
                  <b>Heritage Sites</b>
                  <span>{state.heritage}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="atlas-footnote">
        Historical-cultural exploration map · Modern countries and borders are shown for geographic reference.
      </div>
    </section>
  )
}
