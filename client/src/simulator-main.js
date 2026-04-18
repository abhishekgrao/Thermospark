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
let currentBaseTemp = 0 // Track current temperature for cooling calculations

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

// ── INIT MAP ──

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
  
  // 2. Satellite Layer (Lightning Fast Single Fetch Hybrid)
  const satelliteMap = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20 })

  // Default view
  streetMap.addTo(map)

  // 4. Use Leaflet's L.control.layers with base and overlays
  L.control.layers({
    "Street Map": streetMap,
    "Satellite": satelliteMap
  }, {}, { position: 'topright' }).addTo(map)

  // 5. Heatmap Toggle Button (Top Left)
  const heatControl = L.control({ position: 'topleft' })
  heatControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control')
    div.innerHTML = `<button id="toggle-heatmap" style="padding: 8px 12px; background: #ea580c; color: white; border: none; cursor: pointer; font-size: 14px; font-weight: bold; border-radius: 4px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">Show Thermal Map</button>`
    
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

// ── FAKE REALISTIC HEATMAP LOGIC ──

// Efficient offline heuristic for grid calculations representing realistic FLIR thermal mapping
function getGridHeuristics(lat, lon) {
  const distCenter = Math.sqrt(Math.pow(lat - 12.305, 2) + Math.pow(lon - 76.64, 2))
  let density = Math.max(10, Math.min(100, Math.round(100 - (distCenter * 1500))))
  
  let elevationBoost = 0
  if (lat >= 12.27 && lat <= 12.30 && lon >= 76.67 && lon <= 76.69) {
    elevationBoost = 40
    density = 10 
  }
  
  const baseGreenery = 100 - density
  let greenery = (baseGreenery * 0.5) + (elevationBoost * 0.3) + 20
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
  
  if (!baseWeatherData) {
    try {
      baseWeatherData = await getWeather(MYSURU_LAT, MYSURU_LON)
    } catch (e) {
      baseWeatherData = { temp: '30', wind: '2' }
    }
  }

  const baseTemp = parseFloat(baseWeatherData.temp || 30)
  const wind = parseFloat(baseWeatherData.wind || 2)
  
  const maxH = baseTemp + 30 - (wind * 1.5)
  const minH = baseTemp - 25 - (wind * 1.5)

  const points = []
  
  // DENSE Grid Generation for seamless FLIR-style blanket
  for (let lat = minLat; lat <= maxLat; lat += 0.005) {
    for (let lon = minLon; lon <= maxLon; lon += 0.005) {
      const { density, greenery } = getGridHeuristics(lat, lon)
      const heat = baseTemp + (density * 0.3) - (greenery * 0.25) - (wind * 1.5)
      const intensity = Math.max(0, Math.min(1, (heat - minH) / (maxH - minH)))
      
      points.push([lat, lon, intensity])
    }
  }

  if (heatLayer) map.removeLayer(heatLayer)
  
  heatLayer = L.heatLayer(points, {
    radius: 40,
    blur: 35,
    maxZoom: 17,
    gradient: {
      0.3: '#1e3a8a',
      0.5: '#10b981',
      0.7: '#f59e0b',
      0.9: '#ef4444',
      1.0: '#7f1d1d'
    }
  }).addTo(map)
}

async function toggleHeatmap() {
  isHeatmapActive = !isHeatmapActive
  const btn = document.getElementById('toggle-heatmap')
  
  if (isHeatmapActive) {
    if (btn) btn.innerHTML = 'Hide Thermal Map'
    await updateHeatmap()
    map.on('moveend', updateHeatmap)
  } else {
    if (btn) btn.innerHTML = 'Show Thermal Map'
    if (heatLayer) map.removeLayer(heatLayer)
    heatLayer = null
    map.off('moveend', updateHeatmap)
  }
}

// ── THERMODYNAMIC ENGINE ──

function generateThermodynamicAnalysis(temp, density, greenery, wind) {
  let radLevel, radExp, radReason;
  // Radiation
  if (temp > 35) { radLevel = 'High'; radExp = 'Strong sunlight is heating roads and buildings.'; radReason = `Because the temperature is ${temp}°C, surfaces are heavily absorbing solar energy.`; }
  else if (temp >= 30) { radLevel = 'Medium'; radExp = 'Sunlight is moderately heating the area.'; radReason = `With a temperature of ${temp}°C, solar radiation is noticeable but not severe.`; }
  else { radLevel = 'Low'; radExp = 'Sunlight impact is relatively mild.'; radReason = `At ${temp}°C, the solar heat absorption is minimal.`; }

  // Conduction
  let condLevel, condExp, condReason;
  if (density > 70) { condLevel = 'High'; condExp = 'Concrete and asphalt are storing massive amounts of heat.'; condReason = `A high density of ${density}% means materials will trap and emit heat late into the night.`; }
  else if (density >= 30) { condLevel = 'Medium'; condExp = 'Buildings are storing a moderate amount of heat.'; condReason = `At ${density}% density, there is enough concrete to retain some heat, but open spaces help limit it.`; }
  else { condLevel = 'Low'; condExp = 'Heat storage in materials is low.'; condReason = `A low density of ${density}% means there are few structures to trap conductive heat.`; }

  // Convection
  let convLevel, convExp, convReason;
  if (wind < 2 && density > 60) { convLevel = 'Poor'; convExp = 'Air is stagnant and heat is physically trapped between buildings.'; convReason = `A low wind speed of ${wind}m/s combined with high density prevents airflow.`; }
  else if (wind > 5) { convLevel = 'Good'; convExp = 'Fresh airflow is sweeping the heat away.'; convReason = `Strong winds of ${wind}m/s easily push hot air out of the area.`; }
  else { convLevel = 'Moderate'; convExp = 'Airflow is providing some cooling relief.'; convReason = `Winds at ${wind}m/s are circulating the air, but may struggle against high temperatures.`; }

  // Greenery Effect Modifiers
  if (greenery > 60) {
    radReason += " However, thick greenery provides powerful cooling shade.";
    condReason += " Large presence of trees reduces soil baking.";
    convReason += " Leaves also cool the air through moisture evaporation.";
  } else if (greenery < 30) {
    radReason += " The lack of trees makes the sunlight hit surfaces directly.";
    condReason += " Bare surfaces heavily amplify the heat storage.";
  }

  // Summary
  let summary = "";
  if (temp > 35 && density > 70 && greenery < 30) {
    summary = "High temperature is severely amplified by dense concrete and lack of greenery, causing a strong urban heat island effect.";
  } else if (temp > 35 && greenery > 60) {
    summary = "Despite the high temperature, abundant greenery is significantly helping to cool the area through shade and evaporation.";
  } else if (wind > 5) {
    summary = "Fast airflow is acting as the primary cooling mechanism, flushing out built-up heat.";
  } else {
    summary = "The thermal environment evaluates to a moderate mix of solar heating and structural heat retention.";
  }

  return {
    radiation: { level: radLevel, explanation: radExp, reason: radReason },
    conduction: { level: condLevel, explanation: condExp, reason: condReason },
    convection: { level: convLevel, explanation: convExp, reason: convReason },
    summary: summary
  };
}

// ── UI Update ──

function updateUI(data) {
  // Hide loading, show data
  els.loadingState.classList.add('hidden')
  els.dataState.classList.remove('hidden')
  
  // Show base thermo section block but hide content
  const engineSection = document.getElementById('thermo-engine-section')
  const engineContent = document.getElementById('engine-content')
  const explainBtn = document.getElementById('btn-explain-pls')
  const explainLoader = document.getElementById('explain-loader')

  if (engineSection) {
    engineSection.style.display = 'block'
    engineContent.classList.add('hidden')
    engineContent.style.display = 'none'
    explainLoader.classList.add('hidden')
    explainLoader.style.display = 'none'
    explainBtn.style.display = 'block'
    explainBtn.onclick = () => triggerExplanationAnimation()
  }

  const parsedTemp = typeof data.weather.temp === 'number' ? Math.round(data.weather.temp) : parseFloat(data.weather.temp) || 0
  currentBaseTemp = parsedTemp; // Store for cooling
  const parsedWind = parseFloat(data.weather.wind) || 0
  
  // Also reset the cooling section completely
  const coolingSection = document.getElementById('cooling-section')
  if (coolingSection) coolingSection.classList.add('hidden')
  resetCoolingSection()
  
  const dScore = data.density.score
  const gScore = data.greenery.score

  // Weather Updates
  els.valTemp.textContent = data.weather.temp === 'Error' ? 'Error' : `${parsedTemp}°C` 
  els.valWeather.textContent = data.weather.description
  els.valWind.textContent = `${data.weather.wind} m/s`
  els.valRain.textContent = data.weather.rain

  // Density Updates
  els.valDensity.textContent = `${data.density.label} (${dScore}%)`
  
  // Reset density colors
  els.valDensity.className = 'metric-value badge-metric'
  if (dScore > 70) els.valDensity.classList.add('badge-status-high-red')
  else if (dScore >= 30) els.valDensity.classList.add('badge-status-high-orange')
  else els.valDensity.classList.add('badge-status-normal')

  // Greenery Updates
  els.valGreenery.textContent = `${data.greenery.label} (${gScore}%)`
  
  // Reset greenery colors
  els.valGreenery.className = 'metric-value badge-metric'
  if (gScore < 30) els.valGreenery.classList.add('badge-status-low-red')
  else if (gScore >= 60) els.valGreenery.classList.add('badge-status-good-green')
  else els.valGreenery.classList.add('badge-status-normal')

  // Prepare local data for the engine
  if (document.getElementById('engine-summary')) {
    const thermo = generateThermodynamicAnalysis(parsedTemp, dScore, gScore, parsedWind)
    document.getElementById('engine-summary').textContent = thermo.summary
    
    document.getElementById('rad-lvl').textContent = `[${thermo.radiation.level}]`
    document.getElementById('rad-txt').textContent = `${thermo.radiation.explanation} ${thermo.radiation.reason}`
    
    document.getElementById('cond-lvl').textContent = `[${thermo.conduction.level}]`
    document.getElementById('cond-txt').textContent = `${thermo.conduction.explanation} ${thermo.conduction.reason}`
    
    document.getElementById('conv-lvl').textContent = `[${thermo.convection.level}]`
    document.getElementById('conv-txt').textContent = `${thermo.convection.explanation} ${thermo.convection.reason}`
  }
  
  // Call the dynamic generator using the raw metrics so it populates the specific list secretly in the background
  generateCoolingStrategies(parsedTemp, dScore, gScore, parsedWind)
}

function triggerExplanationAnimation() {
  const explainBtn = document.getElementById('btn-explain-pls')
  const explainLoader = document.getElementById('explain-loader')
  const engineContent = document.getElementById('engine-content')
  const barFill = document.getElementById('explain-bar-fill')
  const pctText = document.getElementById('explain-pct')
  
  // Transform UI
  explainBtn.style.display = 'none'
  explainLoader.classList.remove('hidden')
  explainLoader.style.display = 'block'
  engineContent.classList.add('hidden')
  engineContent.style.display = 'none'
  
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 15) + 5
    if (progress > 100) progress = 100
    
    barFill.style.width = `${progress}%`
    pctText.textContent = progress
    
    if (progress === 100) {
      clearInterval(interval)
      setTimeout(() => {
        explainLoader.classList.add('hidden')
        explainLoader.style.display = 'none'
        engineContent.classList.remove('hidden')
        engineContent.style.display = 'block'
        
        // Auto scroll
        document.getElementById('cooling-section').classList.remove('hidden')
        setTimeout(() => {
          document.getElementById('thermo-engine-section').scrollIntoView({ behavior: 'smooth', block: 'end' })
        }, 100)
      }, 400)
    }
  }, 150)
}

// ── COOLING MODULE ──

function getStrategyPool() {
  return [
    // --- PREVIOUS MEDIUM/HIGH COST ---
    { title: "Lime + jaggery roof coating", desc: "Traditional waterproof + cooling", type: "Traditional", icon: "🏺", minRed: 0.5, maxRed: 0.5, cost: "₹2k-6k", tags: ['traditional', 'medium'], link: "https://www.amazon.in/s?k=heat+reflective+roof+paint", condition: (t, d, g) => d > 40 },
    { title: "Earthen (mud) roofing", desc: "Strong thermal resistance", type: "Traditional", icon: "🏺", minRed: 0.6, maxRed: 0.6, cost: "₹5k-15k", tags: ['traditional', 'high'], condition: (t, d, g) => d > 30 },
    { title: "Thatch roofing (coconut/palm)", desc: "Excellent shade", type: "Traditional", icon: "🏺", minRed: 0.7, maxRed: 0.7, cost: "₹3k-10k", tags: ['traditional', 'medium'], condition: (t, d, g) => g >= 0 },
    { title: "Courtyard (angan) design", desc: "Natural airflow system", type: "Traditional", icon: "🏺", minRed: 0.6, maxRed: 0.6, cost: "₹10k+", tags: ['traditional', 'high'], condition: (t, d, g) => d > 50 },
    { title: "Verandah shading (deep chhajja)", desc: "Blocks sun", type: "Traditional", icon: "🏺", minRed: 0.5, maxRed: 0.5, cost: "₹5k-15k", tags: ['traditional', 'medium'], condition: (t, d, g) => d > 40 },
    { title: "Jaali stone screens", desc: "Airflow + shade", type: "Traditional", icon: "🏺", minRed: 0.4, maxRed: 0.4, cost: "₹5k-20k", tags: ['traditional', 'high'], condition: (t, d, g) => d > 60 },
    { title: "Stepwell-style water storage", desc: "Cooling microclimate", type: "Traditional", icon: "🏺", minRed: 0.6, maxRed: 0.6, cost: "₹20k+", tags: ['traditional', 'high'], condition: (t, d, g) => t > 35 },
    { title: "Tree shading over roads", desc: "Direct heat reduction", type: "Greenery", icon: "🌳", minRed: 0.8, maxRed: 0.8, cost: "₹5k-15k", tags: ['medium'], condition: (t, d, g) => g < 50 },
    { title: "Bamboo plant clusters", desc: "Fast-growing shade", type: "Greenery", icon: "🌳", minRed: 0.5, maxRed: 0.5, cost: "₹2k-6k", tags: ['medium'], condition: (t, d, g) => g < 60 },
    { title: "Shade nets in open areas", desc: "Quick fix", type: "Greenery", icon: "🌳", minRed: 0.4, maxRed: 0.4, cost: "₹2k-5k", tags: ['quick-impact', 'medium'], link: "https://www.amazon.in/s?k=shade+net+garden", condition: (t, d, g) => t > 33 },
    { title: "Agroforestry strips", desc: "Long-term", type: "Greenery", icon: "🌳", minRed: 0.6, maxRed: 0.6, cost: "₹10k-25k", tags: ['long-term', 'high'], condition: (t, d, g) => g < 30 },
    { title: "Double roof system (air gap)", desc: "Heat barrier", type: "Architecture", icon: "🏠", minRed: 0.7, maxRed: 0.7, cost: "₹10k-25k", tags: ['high'], condition: (t, d, g) => d > 50 },
    { title: "Roof ventilation gaps", desc: "Heat escape", type: "Architecture", icon: "🏠", minRed: 0.4, maxRed: 0.4, cost: "₹2k-8k", tags: ['medium'], condition: (t, d, g) => d > 50 },
    { title: "Thick mud walls", desc: "Insulation", type: "Architecture", icon: "🏠", minRed: 0.5, maxRed: 0.5, cost: "₹8k-20k", tags: ['traditional', 'high'], condition: (t, d, g) => d >= 0 },
    { title: "Internal shaded corridors", desc: "Reduce heat gain", type: "Architecture", icon: "🏠", minRed: 0.3, maxRed: 0.3, cost: "₹5k-15k", tags: ['high'], condition: (t, d, g) => d > 60 },
    { title: "Cross-ventilation openings", desc: "Strong airflow", type: "Airflow", icon: "🌬", minRed: 0.6, maxRed: 0.6, cost: "₹2k-10k", tags: ['medium'], condition: (t, d, g, w) => w < 4 },
    { title: "Wind catchers (traditional towers)", desc: "Passive cooling", type: "Airflow", icon: "🌬", minRed: 0.7, maxRed: 0.7, cost: "₹15k+", tags: ['traditional', 'high'], condition: (t, d, g, w) => w < 3 },
    { title: "Elevated structures (stilts)", desc: "Air movement below", type: "Airflow", icon: "🌬", minRed: 0.4, maxRed: 0.4, cost: "₹10k+", tags: ['high'], condition: (t, d, g) => d > 40 },
    { title: "Open ground floors (pilotis style)", desc: "Air circulation", type: "Airflow", icon: "🌬", minRed: 0.5, maxRed: 0.5, cost: "₹15k+", tags: ['high'], condition: (t, d, g) => d > 70 },
    { title: "Clay tile water drip roofs", desc: "Evap cooling", type: "Water", icon: "💧", minRed: 0.5, maxRed: 0.5, cost: "₹3k-10k", tags: ['traditional', 'medium'], condition: (t, d, g) => t > 33 },
    { title: "Mist pipes in open areas", desc: "Effective cooling", type: "Water", icon: "💧", minRed: 0.6, maxRed: 0.6, cost: "₹5k-15k", tags: ['medium'], link: "https://www.amazon.in/s?k=mist+cooling+system", condition: (t, d, g) => t > 35 },
    { title: "Shallow water channels", desc: "Cooling effect", type: "Water", icon: "💧", minRed: 0.4, maxRed: 0.4, cost: "₹5k-20k", tags: ['medium'], condition: (t, d, g) => t > 30 },
    { title: "Evaporative courtyards", desc: "Passive cooling", type: "Water", icon: "💧", minRed: 0.6, maxRed: 0.6, cost: "₹10k+", tags: ['traditional', 'high'], condition: (t, d, g) => d > 50 },

    // --- NEW BUDGET / LOW-COST (₹0–3000) ---
    { title: "Lime wash on roofs", desc: "Reflects sunlight", type: "Traditional", icon: "🏺", minRed: 0.5, maxRed: 0.5, cost: "₹500–1500", tags: ['low-cost', 'traditional', 'quick-impact'], link: "https://www.amazon.in/s?k=heat+reflective+roof+paint", condition: (t, d, g) => true },
    { title: "Wet gunny bags on roofs", desc: "Evaporative cooling", type: "Traditional", icon: "🏺", minRed: 0.3, maxRed: 0.3, cost: "₹200–500", tags: ['low-cost', 'traditional', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Mud plaster coating", desc: "Natural insulation", type: "Traditional", icon: "🏺", minRed: 0.4, maxRed: 0.4, cost: "₹500–2000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Cow dung coating (rural)", desc: "Thermal barrier", type: "Traditional", icon: "🏺", minRed: 0.3, maxRed: 0.3, cost: "₹200–1000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Earthen pots (matka cooling)", desc: "Micro cooling", type: "Traditional", icon: "🏺", minRed: 0.2, maxRed: 0.2, cost: "₹200–800", tags: ['low-cost', 'traditional'], link: "https://www.amazon.in/s?k=clay+pot+matka", condition: (t, d, g) => t > 30 },
    { title: "Bamboo mats for shading", desc: "Blocks sunlight", type: "Traditional", icon: "🏺", minRed: 0.4, maxRed: 0.4, cost: "₹500–2000", tags: ['low-cost', 'traditional', 'quick-impact'], link: "https://www.amazon.in/s?k=bamboo+mat+shade", condition: (t, d, g) => true },
    { title: "Thatch cover (temporary)", desc: "Natural insulation", type: "Traditional", icon: "🏺", minRed: 0.5, maxRed: 0.5, cost: "₹1000–3000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Wet cloth window shading", desc: "Instant cooling", type: "Traditional", icon: "🏺", minRed: 0.2, maxRed: 0.2, cost: "₹100–300", tags: ['low-cost', 'traditional', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Clay tile covering", desc: "Reduces heat absorption", type: "Traditional", icon: "🏺", minRed: 0.5, maxRed: 0.5, cost: "₹1000–3000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Courtyard water sprinkling", desc: "Quick cooling", type: "Traditional", icon: "🏺", minRed: 0.3, maxRed: 0.3, cost: "₹100–500", tags: ['low-cost', 'traditional', 'quick-impact'], condition: (t, d, g) => true },

    { title: "Plant Tulsi + small shrubs", desc: "Easy", type: "Greenery", icon: "🌿", minRed: 0.2, maxRed: 0.2, cost: "₹100–500", tags: ['low-cost'], condition: (t, d, g) => true },
    { title: "Creepers on walls", desc: "Shade walls", type: "Greenery", icon: "🌿", minRed: 0.3, maxRed: 0.3, cost: "₹200–1000", tags: ['low-cost', 'long-term'], link: "https://www.amazon.in/s?k=creeper+plant+seeds", condition: (t, d, g) => true },
    { title: "Potted plants on terrace", desc: "Surface cooling", type: "Greenery", icon: "🌿", minRed: 0.3, maxRed: 0.3, cost: "₹500–2000", tags: ['low-cost'], link: "https://www.amazon.in/s?k=hanging+planters", condition: (t, d, g) => true },
    { title: "Grass patches", desc: "Reduce ground heat", type: "Greenery", icon: "🌿", minRed: 0.3, maxRed: 0.3, cost: "₹500–2000", tags: ['low-cost'], condition: (t, d, g) => true },
    { title: "Local native plants", desc: "Low maintenance", type: "Greenery", icon: "🌿", minRed: 0.4, maxRed: 0.4, cost: "₹300–1500", tags: ['low-cost', 'long-term'], condition: (t, d, g) => true },
    { title: "Banana plants (fast shade)", desc: "Quick growth", type: "Greenery", icon: "🌿", minRed: 0.5, maxRed: 0.5, cost: "₹500–1500", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Drumstick tree (Moringa)", desc: "Useful + cooling", type: "Greenery", icon: "🌿", minRed: 0.4, maxRed: 0.4, cost: "₹300–1000", tags: ['low-cost', 'long-term'], condition: (t, d, g) => true },
    { title: "Small tree clusters", desc: "Better impact", type: "Greenery", icon: "🌿", minRed: 0.5, maxRed: 0.5, cost: "₹1000–3000", tags: ['low-cost', 'long-term'], condition: (t, d, g) => true },
    { title: "Vertical garden kit", desc: "Modular greenery", type: "Greenery", icon: "🌿", minRed: 0.4, maxRed: 0.4, cost: "₹1k–3k", tags: ['low-cost', 'long-term'], link: "https://www.amazon.in/s?k=vertical+garden+planter", condition: (t, d, g) => true },
    { title: "Shade plants near walls", desc: "Local cooling", type: "Greenery", icon: "🌿", minRed: 0.2, maxRed: 0.2, cost: "₹200–1000", tags: ['low-cost'], condition: (t, d, g) => true },

    { title: "Open windows opposite sides", desc: "Cross ventilation", type: "Airflow", icon: "🌬", minRed: 0.4, maxRed: 0.4, cost: "₹0", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Remove temporary obstructions", desc: "Better airflow", type: "Airflow", icon: "🌬", minRed: 0.3, maxRed: 0.3, cost: "₹0", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Use jaali blocks (cheap)", desc: "Ventilation", type: "Airflow", icon: "🌬", minRed: 0.4, maxRed: 0.4, cost: "₹1000–3000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Keep terrace open", desc: "Heat escape", type: "Airflow", icon: "🌬", minRed: 0.2, maxRed: 0.2, cost: "₹0", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Window shade awning", desc: "External sun block", type: "Airflow", icon: "🌬", minRed: 0.5, maxRed: 0.5, cost: "₹2k–5k", tags: ['medium', 'quick-impact'], link: "https://www.amazon.in/s?k=window+awning", condition: (t, d, g) => true },
    { title: "Use bamboo partitions", desc: "Breathable walls", type: "Airflow", icon: "🌬", minRed: 0.3, maxRed: 0.3, cost: "₹500–2000", tags: ['low-cost'], condition: (t, d, g) => true },
    { title: "Keep pathways open", desc: "Heat escape", type: "Airflow", icon: "🌬", minRed: 0.3, maxRed: 0.3, cost: "₹0", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Add vent holes near roof", desc: "Hot air exits", type: "Airflow", icon: "🌬", minRed: 0.4, maxRed: 0.4, cost: "₹500–1500", tags: ['low-cost'], condition: (t, d, g) => true },
    { title: "Avoid clutter near windows", desc: "Better airflow", type: "Airflow", icon: "🌬", minRed: 0.2, maxRed: 0.2, cost: "₹0", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Use cloth shades instead of walls", desc: "Air passes", type: "Airflow", icon: "🌬", minRed: 0.3, maxRed: 0.3, cost: "₹300–1000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },

    { title: "Sprinkle water on roof", desc: "Quick effect", type: "Water", icon: "💧", minRed: 0.3, maxRed: 0.3, cost: "₹100–500", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Keep wet sand layer", desc: "Evap cooling", type: "Water", icon: "💧", minRed: 0.3, maxRed: 0.3, cost: "₹200–1000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Small water tubs", desc: "Local cooling", type: "Water", icon: "💧", minRed: 0.2, maxRed: 0.2, cost: "₹200–500", tags: ['low-cost'], condition: (t, d, g) => true },
    { title: "Clay pot evaporation", desc: "Passive cooling", type: "Water", icon: "💧", minRed: 0.2, maxRed: 0.2, cost: "₹200–800", tags: ['low-cost', 'traditional'], link: "https://www.amazon.in/s?k=clay+pot+matka", condition: (t, d, g) => true },
    { title: "Wet floor cleaning", desc: "Temporary cooling", type: "Water", icon: "💧", minRed: 0.2, maxRed: 0.2, cost: "₹100–300", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Hanging water cloth strips", desc: "Evap effect", type: "Water", icon: "💧", minRed: 0.2, maxRed: 0.2, cost: "₹100–500", tags: ['low-cost', 'quick-impact'], condition: (t, d, g) => true },
    { title: "Drip irrigation kit", desc: "Automated plant watering", type: "Water", icon: "💧", minRed: 0.3, maxRed: 0.3, cost: "₹1k–2k", tags: ['low-cost', 'long-term'], link: "https://www.amazon.in/s?k=drip+irrigation+kit", condition: (t, d, g) => true },
    { title: "Keep shaded water storage", desc: "Micro cooling", type: "Water", icon: "💧", minRed: 0.2, maxRed: 0.2, cost: "₹200–800", tags: ['low-cost'], condition: (t, d, g) => true },
    { title: "Use earthen water channels", desc: "Traditional", type: "Water", icon: "💧", minRed: 0.3, maxRed: 0.3, cost: "₹500–2000", tags: ['low-cost', 'traditional'], condition: (t, d, g) => true },
    { title: "Damp curtains", desc: "Cooling breeze", type: "Water", icon: "💧", minRed: 0.3, maxRed: 0.3, cost: "₹200–800", tags: ['low-cost', 'quick-impact'], link: "https://www.amazon.in/s?k=jute+curtain", condition: (t, d, g) => true },

    // --- SIMPLE COOLING METHODS (NO AC REQUIRED) ---
    { title: "Wet Curtain Cooling", desc: "Evaporative cotton/khus cooling", type: "Simple", icon: "🧊", minRed: 2.0, maxRed: 5.0, cost: "₹300–800", tags: ['low-cost', 'quick-impact'], link: "https://www.amazon.in/s?k=khus+curtain", condition: (t, d, g) => true },
    { title: "Floor Sleeping Method", desc: "Heat rises, stay low", type: "Simple", icon: "🧊", minRed: 1.0, maxRed: 3.0, cost: "₹0–500", tags: ['low-cost'], link: "https://www.amazon.in/s?k=chatai+mat", condition: (t, d, g) => true },
    { title: "Ice + Fan Cooling Trick", desc: "DIY localized AC effect", type: "Simple", icon: "🧊", minRed: 1.0, maxRed: 2.0, cost: "₹200–500", tags: ['low-cost', 'quick-impact'], link: "https://www.amazon.in/s?k=ice+pack", condition: (t, d, g) => true },
    { title: "Cross Ventilation Setup", desc: "Convection cooling breeze", type: "Simple", icon: "🧊", minRed: 2.0, maxRed: 4.0, cost: "₹0", tags: ['low-cost', 'quick-impact'], link: "https://www.amazon.in/s?k=exhaust+fan", condition: (t, d, g) => true },
    { title: "Switch Off Heat Sources", desc: "Reduce internal thermal load", type: "Simple", icon: "🧊", minRed: 1.0, maxRed: 3.0, cost: "₹0", tags: ['low-cost', 'quick-impact'], link: "https://www.amazon.in/s?k=led+bulb+low+heat", condition: (t, d, g) => true },
  ]
}

let generatedOptions = []

function generateCoolingStrategies(temp, density, greenery, wind) {
  const allPool = getStrategyPool().filter(s => s.condition(temp, density, greenery, wind))
  
  const lowCostPool = allPool.filter(s => s.tags.includes('low-cost'))
  const highMedPool = allPool.filter(s => !s.tags.includes('low-cost'))

  let selected = []
  
  if (temp > 35) {
    // 70% low-cost, quick-impact
    const count = 12
    const lowCount = Math.floor(count * 0.70)
    const medCount = count - lowCount
    
    selected = [
      ...lowCostPool.sort(() => 0.5 - Math.random()).slice(0, lowCount),
      ...highMedPool.sort(() => 0.5 - Math.random()).slice(0, medCount)
    ]
  } else if (temp >= 30) {
    // Mix of low-cost + structural
    const count = 8
    selected = [
      ...lowCostPool.sort(() => 0.5 - Math.random()).slice(0, 4),
      ...highMedPool.sort(() => 0.5 - Math.random()).slice(0, 4)
    ]
  } else {
    // Light low-cost
    const count = 5
    selected = lowCostPool.sort(() => 0.5 - Math.random()).slice(0, count)
  }

  // Final mapping
  generatedOptions = selected.map(s => {
    const rawVal = s.minRed + (Math.random() * (s.maxRed - s.minRed))
    return { ...s, val: parseFloat(rawVal.toFixed(1)) }
  })

  // Render unconditionally
  renderCoolingStrategies(generatedOptions, 'all')
}

// Global hook for filtering
window.applyCoolingFilter = function(filter) {
  let filtered = generatedOptions
  if (filter === 'low-cost') {
    filtered = generatedOptions.filter(s => s.tags.includes('low-cost'))
  } else if (filter === 'traditional') {
    filtered = generatedOptions.filter(s => s.tags.includes('traditional'))
  }
  
  renderCoolingStrategies(filtered, filter)
}

function renderCoolingStrategies(strategies, filterType = 'all') {
  const container = document.getElementById('modal-options-container')
  if (!container) return
  
  container.innerHTML = ''
  
  // Group by type
  const groups = {
    "🏺 Traditional Indian Methods": strategies.filter(s => s.type === "Traditional"),
    "🌳 Micro-Level Green Cooling": strategies.filter(s => s.type === "Greenery" || s.type === "Trees"),
    "🏠 Passive Architecture": strategies.filter(s => s.type === "Architecture" || s.type === "Materials"),
    "🌬 Advanced Airflow Ideas": strategies.filter(s => s.type === "Airflow"),
    "💧 Evaporative Cooling": strategies.filter(s => s.type === "Water"),
    "🧊 Simple Methods (No AC)": strategies.filter(s => s.type === "Simple")
  }

  let idx = 0;

  for (const [category, items] of Object.entries(groups)) {
    if (items.length === 0) continue

    const catHTML = `
      <div class="cat-group" data-group="${category}">
        <h3 class="cat-title">${category}</h3>
        <div class="cooling-options">
          ${items.map(s => {
            const id = idx++
            return `
              <label class="cooling-card" data-tags="${s.tags.join(' ')}">
                <input type="checkbox" value="${s.val}" id="opt-${id}" />
                <div class="card-inner">
                  <span class="opt-icon">${s.icon}</span>
                  <div class="opt-content">
                    <div class="opt-title-row">
                      <span class="opt-title">${s.title} <span class="opt-cost">${s.cost}</span></span>
                      ${s.link ? `<a href="${s.link}" target="_blank" class="btn-view-item">View Item</a>` : ''}
                    </div>
                    <div class="opt-tags">
                      ${s.tags.map(t => {
                        let cls = 'tag-default';
                        if (t === 'low-cost') cls = 'tag-low';
                        if (t === 'traditional') cls = 'tag-trad';
                        if (t === 'quick-impact') cls = 'tag-quick';
                        return `<span class="opt-tag ${cls}">${t.replace('-', ' ')}</span>`
                      }).join('')}
                    </div>
                    <span class="opt-desc">${s.desc}</span>
                  </div>
                  <span class="opt-val">-${s.val}°C</span>
                </div>
              </label>
            `
          }).join('')}
        </div>
      </div>
    `
    container.insertAdjacentHTML('beforeend', catHTML)
  }

  // Update button active state
  const btns = document.querySelectorAll('.filter-btn');
  btns.forEach(b => {
    b.classList.remove('active')
    if (b.dataset.filter === filterType) b.classList.add('active')
  })

  // Hook change logic
  const checkboxes = document.querySelectorAll('.cooling-card input[type="checkbox"]')
  checkboxes.forEach(cb => {
    cb.addEventListener('change', calculateCooling)
  })
  
  // Wipe internal red output on re-render filter if they are clicking around
  calculateCooling()
}

function resetCoolingSection() {
  const modal = document.getElementById('cooling-modal')
  if (modal) modal.classList.add('hidden')
  document.body.style.overflow = ''
  
  const checkboxes = document.querySelectorAll('.cooling-card input[type="checkbox"]')
  checkboxes.forEach(cb => cb.checked = false)
  
  const tempEl = document.getElementById('res-current-temp')
  if(tempEl) tempEl.textContent = `${currentBaseTemp.toFixed(1)}°C`
  
  const optEl = document.getElementById('res-opt-temp')
  if(optEl) optEl.textContent = `${currentBaseTemp.toFixed(1)}°C`
  
  const redEl = document.getElementById('res-total-red')
  if(redEl) redEl.textContent = `0.0°C`
}

function initCoolingModule() {
  const toggleBtn = document.getElementById('btn-optimize-toggle')
  const modal = document.getElementById('cooling-modal')
  const closeX = document.getElementById('btn-modal-x')
  const closeBtn = document.getElementById('btn-modal-close')

  function openModal() {
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden' // lock map scrolling behind modal
  }
  
  function closeModal() {
    modal.classList.add('hidden')
    document.body.style.overflow = '' // unlock scrolling
  }

  if (toggleBtn) toggleBtn.onclick = openModal
  if (closeX) closeX.onclick = closeModal
  if (closeBtn) closeBtn.onclick = closeModal
  
  // click outside to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal()
    })
  }

  // escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal()
    }
  })

  // Hook up filter buttons
  const filterBtns = document.querySelectorAll('.filter-btn')
  filterBtns.forEach(b => {
    b.onclick = (e) => {
      window.applyCoolingFilter(e.target.dataset.filter)
    }
  })
}

function calculateCooling() {
  let totalReduction = 0
  
  const checkboxes = document.querySelectorAll('.cooling-card input[type="checkbox"]')
  checkboxes.forEach(cb => {
    if (cb.checked) {
      totalReduction += parseFloat(cb.value)
    }
  })
  
  const optTemp = currentBaseTemp - totalReduction
  
  // Animate numbers
  animateNumber('res-opt-temp', optTemp)
  animateNumber('res-total-red', totalReduction, true)
}

function animateNumber(elementId, targetValue, isReduction = false) {
  const el = document.getElementById(elementId)
  if (!el) return
  
  const currentStr = el.textContent.replace('°C', '')
  let startValue = parseFloat(currentStr) || (isReduction ? 0 : currentBaseTemp)
  
  const duration = 400
  const frames = 20
  let step = 0
  
  const diff = targetValue - startValue
  
  const interval = setInterval(() => {
    step++
    const newVal = startValue + (diff * (step / frames))
    el.textContent = `${newVal.toFixed(1)}°C`
    
    if (step >= frames) {
      clearInterval(interval)
      el.textContent = `${targetValue.toFixed(1)}°C`
    }
  }, duration / frames)
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initMap()
  initCoolingModule()
})
