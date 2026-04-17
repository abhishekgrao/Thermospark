import L from 'leaflet'

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

let simMap = null
let heatCircle = null
let simMarker = null

export function initPreviewMap(containerId) {
  const container = document.getElementById(containerId)
  if (!container) return null

  const map = L.map(containerId, {
    center: [12.9716, 77.5946],
    zoom: 12,
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
    attributionControl: false,
  })

  L.tileLayer(DARK_TILES, { maxZoom: 18 }).addTo(map)
  return map
}

export function initSimMap(containerId) {
  if (simMap) return simMap

  const container = document.getElementById(containerId)
  if (!container) return null

  simMap = L.map(containerId, {
    center: [12.9716, 77.5946],
    zoom: 12,
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: false,
  })

  L.tileLayer(DARK_TILES, { maxZoom: 18 }).addTo(simMap)

  // Initial heat circle
  heatCircle = L.circle([12.9716, 77.5946], {
    color: 'transparent',
    fillColor: '#F97316',
    fillOpacity: 0.22,
    radius: 5000,
  }).addTo(simMap)

  return simMap
}

export function updateMapOverlay(lat, lon, color, temperature) {
  if (!simMap) return

  // Move map to city
  simMap.flyTo([lat, lon], 12, { duration: 1.2 })

  if (heatCircle) {
    heatCircle.setLatLng([lat, lon])
    heatCircle.setStyle({ fillColor: color, fillOpacity: 0.25 })
  }

  if (simMarker) simMarker.remove()
  simMarker = L.marker([lat, lon])
    .addTo(simMap)
    .bindPopup(`<strong>${temperature}°C</strong>`, { closeButton: false })
    .openPopup()
}

export function getTemperatureColor(temp) {
  if (temp < 20) return '#38BDF8' // cool
  if (temp < 26) return '#22C55E' // comfortable
  if (temp < 32) return '#FCD34D' // warm
  if (temp < 38) return '#F97316' // hot
  return '#FB7185'                // extreme
}
