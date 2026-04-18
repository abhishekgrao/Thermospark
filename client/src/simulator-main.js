import 'leaflet/dist/leaflet.css'
import './style.css'
import './simulator.css'
import L from 'leaflet'
import 'leaflet.heat'

// OpenWeatherMap API Key
const WEATHER_API_KEY = 'fffea32cb6c83aa6f5cc12a943a61e99'
const MYSURU_LAT = 12.2958
const MYSURU_LON = 76.6394

let map = null
let marker = null

// Heatmap Variables
let heatLayer = null
let isHeatmapActive = false
let baseWeatherData = null

// UI Elements
const els = {
  loadingState: document.getElementById('loading-state'),
  defaultState: document.getElementById('default-state'),
  dataState: document.getElementById('data-state'),
  valLocation: document.getElementById('val-location'),
  valTemp: document.getElementById('val-temp'),
  valWeather: document.getElementById('val-weather'),
  valWind: document.getElementById('val-wind'),
  valRain: document.getElementById('val-rain'),
  valDensity: document.getElementById('val-density'),
  valGreenery: document.getElementById('val-greenery')
}

// ── HEATMAP LOGIC ──

// Efficient offline heuristic for grid calculations (No API calls)
function getGridHeuristics(lat, lon) {
  const distCenter = Math.sqrt(Math.pow(lat - 12.305, 2) + Math.pow(lon - 76.64, 2))
  let density = Math.max(10, Math.min(100, Math.round(100 - (distCenter * 1500))))
  
  let elevationBoost = 0
  if (lat >= 12.27 && lat <= 12.30 && lon >= 76.67 && lon <= 76.69) {
    elevationBoost = 40
    density = 10 // Mountain
  }
  
  const baseGreenery = 100 - density
  let greenery = (baseGreenery * 0.5) + (elevationBoost * 0.3) + 20 // 20 is generic OSM offset
  greenery = Math.max(0, Math.min(100, greenery))
  
  return { density, greenery }
}

async function updateHeatmap() {
  if (!isHeatmapActive || !map) return
  
  const bounds = map.getBounds()
  const minLat = bounds.getSouth()
  const maxLat = bounds.getNorth()
  const minLon = bounds.getWest()
  const maxLon = bounds.getEast()
  
  // Single Weather fetch caching
  if (!baseWeatherData) {
    try {
      baseWeatherData = await getWeather(MYSURU_LAT, MYSURU_LON)
    } catch (e) {
      baseWeatherData = { temp: '30', wind: '2' } // Fallback
    }
  }

  const baseTemp = parseFloat(baseWeatherData.temp || 30)
  const wind = parseFloat(baseWeatherData.wind || 2)
  
  const maxH = baseTemp + 30 - (wind * 1.5)
  const minH = baseTemp - 25 - (wind * 1.5)

  const points = []
  
  // Generate Grid Points covering visible bounds
  for (let lat = minLat; lat <= maxLat; lat += 0.01) {
    for (let lon = minLon; lon <= maxLon; lon += 0.01) {
      const { density, greenery } = getGridHeuristics(lat, lon)
      
      const heat = baseTemp + (density * 0.3) - (greenery * 0.25) - (wind * 1.5)
      const intensity = Math.max(0, Math.min(1, (heat - minH) / (maxH - minH)))
      
      points.push([lat, lon, intensity])
    }
  }

  if (heatLayer) map.removeLayer(heatLayer)
  
  heatLayer = L.heatLayer(points, {
    radius: 25,
    blur: 20,
    maxZoom: 17
  }).addTo(map)
}

async function toggleHeatmap() {
  isHeatmapActive = !isHeatmapActive
  const btn = document.getElementById('toggle-heatmap')
  
  if (isHeatmapActive) {
    if (btn) btn.innerHTML = 'Hide Heatmap'
    await updateHeatmap()
    map.on('moveend', updateHeatmap)
  } else {
    if (btn) btn.innerHTML = 'Show Heatmap'
    if (heatLayer) map.removeLayer(heatLayer)
    heatLayer = null
    map.off('moveend', updateHeatmap)
  }
}

function initMap() {
  // Initialize Leaflet Map
  map = L.map('sim-map', {
    zoomControl: false,
    attributionControl: false
  }).setView([MYSURU_LAT, MYSURU_LON], 14)

  // Add zoom control to bottom right
  L.control.zoom({ position: 'bottomright' }).addTo(map)

  // 1. Street Map Layer
  const streetMap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 })
  
  // 2. Satellite Layer (Esri Imagery + Labels Overlay)
  const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
  const esriLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 })
  const satelliteMap = L.layerGroup([esriImagery, esriLabels])

  // 4. Default view = Street Map
  streetMap.addTo(map)

  // 3. Layer control toggle (top-right)
  const baseMaps = {
    "Street Map": streetMap,
    "Satellite": satelliteMap
  }
  
  // 5. Use Leaflet's L.control.layers
  L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map)

  // 6. Heatmap Toggle Button (Top Left)
  const heatControl = L.control({ position: 'topleft' })
  heatControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    div.innerHTML = `<button id="toggle-heatmap" style="padding: 8px 12px; background: #ea580c; color: white; border: none; cursor: pointer; font-size: 14px; font-weight: bold; border-radius: 4px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">Show Heatmap</button>`
    
    div.onclick = async function(e) {
      e.stopPropagation()
      await toggleHeatmap()
    }
    return div
  }
  heatControl.addTo(map)

  // Fix: Remove the dark-mode CSS inversion when Satellite view is active
  map.on('baselayerchange', (e) => {
    if (e.name === 'Satellite') {
      document.getElementById('sim-map').classList.add('is-satellite')
    } else {
      document.getElementById('sim-map').classList.remove('is-satellite')
    }
  })

  // Ensure the map container fully renders (fixes the gray box bug)
  setTimeout(() => map.invalidateSize(), 300)

  // User click event
  map.on('click', (e) => {
    const lat = e.latlng.lat
    const lon = e.latlng.lng
    handleLocationClick(lat, lon)
  })
}

async function handleLocationClick(lat, lon) {
  // Update marker
  if (marker) {
    marker.setLatLng([lat, lon])
  } else {
    // Custom SVG marker for theme
    const icon = L.divIcon({
      className: 'custom-pin',
      html: `<div style="background:#F97316; width:16px; height:16px; border-radius:50%; border:2px solid #fff; box-shadow:0 0 10px rgba(249,115,22,0.8);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    })
    marker = L.marker([lat, lon], { icon }).addTo(map)
  }

  // Update UI to Loading
  els.defaultState.classList.add('hidden')
  els.dataState.classList.add('hidden')
  els.loadingState.classList.remove('hidden')

  els.valLocation.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`

  try {
    // Weather
    let weatherData = null
    try { weatherData = await getWeather(lat, lon) } 
    catch(e) { weatherData = { temp: 'Error', description: 'API Limit', wind: '--', rain: '--' } }

    // Area Analysis (Density & Greenery Hybrid)
    let analysisData = await getAreaAnalysis(lat, lon)

    updateUI({
      weather: weatherData,
      density: { score: analysisData.density, label: analysisData.densityLabel },
      greenery: { score: analysisData.greenery, label: analysisData.greeneryLabel }
    })
  } catch (error) {
    console.error("Critical failure:", error)
    els.loadingState.classList.add('hidden')
    els.defaultState.classList.remove('hidden')
  }
}

// ── API Functions ──

async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_API_KEY}&units=metric`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  
  return {
    temp: data.main?.temp || '--',
    description: data.weather?.[0]?.description || 'Unknown',
    wind: data.wind?.speed || 0,
    rain: data.rain ? `${data.rain['1h']} mm/h` : 'None'
  }
}

// ── Heuristic Hybrid Analysis ──

async function getAreaAnalysis(lat, lon) {
  let buildingCount = 0;
  let greenCount = 0;
  let fetchWorked = false;

  try {
    const query = `[out:json];
      (
        way["building"](around:250, ${lat}, ${lon});
        way["landuse"="grass"](around:250, ${lat}, ${lon});
        way["leisure"="park"](around:250, ${lat}, ${lon});
        way["natural"="wood"](around:250, ${lat}, ${lon});
        way["landuse"="forest"](around:250, ${lat}, ${lon});
      );
      out tags limit 1000;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      fetchWorked = true;
      if (data.elements) {
        for (const el of data.elements) {
          const tags = el.tags || {};
          if (tags.building) buildingCount++;
          if (tags.landuse === 'grass' || tags.leisure === 'park' || tags.natural === 'wood' || tags.landuse === 'forest') {
            greenCount++;
          }
        }
      }
    }
  } catch(e) {
    console.warn("Overpass API failed, using base heuristics.");
  }

  // STEP 1 — BUILDING DENSITY
  let osmDensity = 20;
  if (fetchWorked && buildingCount > 0) {
    osmDensity = Math.min((buildingCount / 50) * 100, 100);
  } else if (fetchWorked) {
    osmDensity = 0;
  }

  // STEP 2 — GREENERY
  let osmGreenery = 30;
  if (fetchWorked && greenCount > 0) {
    osmGreenery = Math.min((greenCount / 20) * 100, 100);
  } else if (fetchWorked) {
    osmGreenery = 0;
  }

  // STEP 3 — ELEVATION PROXY (Chamundi Betta area)
  let elevationBoost = 0;
  if (lat >= 12.27 && lat <= 12.30 && lon >= 76.67 && lon <= 76.69) {
    elevationBoost = 40;
  }

  // STEP 4 — DENSITY-GREENERY RELATION
  const baseGreenery = 100 - osmDensity;

  // STEP 5 — FINAL HYBRID CALCULATION
  let rawDensity = osmDensity;
  let rawGreenery = (baseGreenery * 0.5) + (osmGreenery * 0.2) + (elevationBoost * 0.3);

  // STEP 6 — CLEANUP (Clamp & Round)
  let density = Math.max(0, Math.min(100, Math.round(rawDensity / 10) * 10));
  let greenery = Math.max(0, Math.min(100, Math.round(rawGreenery / 10) * 10));

  // STEP 7 — LABELS
  const getLabel = (val) => {
    if (val > 70) return 'High';
    if (val >= 30) return 'Medium';
    return 'Low';
  };

  // STEP 8 — FINAL RETURN
  return {
    density,
    densityLabel: getLabel(density),
    greenery,
    greeneryLabel: getLabel(greenery)
  };
}

// ── UI Update ──

function updateUI(data) {
  // Hide loading, show data
  els.loadingState.classList.add('hidden')
  els.dataState.classList.remove('hidden')

  // Weather Updates
  els.valTemp.textContent = typeof data.weather.temp === 'number' 
    ? `${Math.round(data.weather.temp)}°C` 
    : data.weather.temp
  els.valWeather.textContent = data.weather.description
  els.valWind.textContent = `${data.weather.wind} m/s`
  els.valRain.textContent = data.weather.rain

  // Density Updates
  const dScore = data.density.score
  els.valDensity.textContent = `${data.density.label} (${dScore}%)`
  
  // Reset density colors
  els.valDensity.className = 'metric-value badge-metric'
  if (dScore > 60) els.valDensity.classList.add('badge-status-high-red')
  else if (dScore > 30) els.valDensity.classList.add('badge-status-high-orange')
  else els.valDensity.classList.add('badge-status-normal')

  // Greenery Updates
  const gScore = data.greenery.score
  els.valGreenery.textContent = `${data.greenery.label} (${gScore}%)`
  
  // Reset greenery colors
  els.valGreenery.className = 'metric-value badge-metric'
  if (gScore < 30) els.valGreenery.classList.add('badge-status-low-red')
  else if (gScore >= 60) els.valGreenery.classList.add('badge-status-good-green')
  else els.valGreenery.classList.add('badge-status-normal')
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initMap()
})
