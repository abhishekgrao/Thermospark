import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initSimMap, updateMapOverlay, getTemperatureColor } from '../visuals/map.js'
import { calculateTemperature, getZoneData } from '../simulation/engine.js'
import { initChart, updateChart } from '../simulation/chart.js'
import { initTicker, updateTicker } from '../simulation/ticker.js'
import { fetchWeather } from '../utils/api.js'

let ambientTemp = 32
let cityLat = 12.9716
let cityLon = 77.5946
let chart = null
let simMap = null
let useTicker = false

const params = { greenery: 40, density: 60, airflow: 30, reflectivity: 25 }

export async function initSimulation() {
  // Fade in section
  gsap.from('#s8', {
    autoAlpha: 0, duration: 0.6,
    scrollTrigger: { trigger: '#s8', start: 'top 90%' },
  })

  // Detect which page we're on
  useTicker = !!document.getElementById('impact-ticker')

  // Init map and chart/ticker
  ScrollTrigger.create({
    trigger: '#s8',
    start: 'top 90%',
    once: true,
    onEnter: () => {
      setTimeout(() => {
        simMap = initSimMap('sim-map')
        if (useTicker) {
          initTicker('impact-ticker')
        } else {
          chart = initChart('impact-chart')
        }
        runSimulation()
      }, 200)
    },
  })

  // On simulator page, #s8 may already be in view — init proactively
  if (useTicker) {
    const s8 = document.getElementById('s8')
    if (s8) {
      const rect = s8.getBoundingClientRect()
      if (rect.top < window.innerHeight * 1.2) {
        setTimeout(() => {
          if (!simMap) simMap = initSimMap('sim-map')
          if (!document.querySelector('.ticker-row')) initTicker('impact-ticker')
          runSimulation()
        }, 400)
      }
    }
  }

  // Sliders
  const sliders = [
    { id: 'greenery',     valId: 'greenery-val',     key: 'greenery' },
    { id: 'density',      valId: 'density-val',      key: 'density' },
    { id: 'airflow',      valId: 'airflow-val',       key: 'airflow' },
    { id: 'reflectivity', valId: 'reflectivity-val',  key: 'reflectivity' },
  ]

  sliders.forEach(({ id, valId, key }) => {
    const el = document.getElementById(id)
    const valEl = document.getElementById(valId)
    if (!el) return

    el.addEventListener('input', () => {
      params[key] = parseInt(el.value)
      if (valEl) valEl.textContent = `${el.value}%`
      runSimulation()
    })
  })

  // City search
  const btn = document.getElementById('city-search-btn')
  const input = document.getElementById('city-input')

  if (btn && input) {
    const doSearch = async () => {
      const city = input.value.trim()
      if (!city) return
      setStatus('Fetching…', '#FCD34D')
      const data = await fetchWeather(city)
      ambientTemp = data.temp
      cityLat = data.lat
      cityLon = data.lon
      const loc = `${data.city}${data.country ? ', ' + data.country : ''}`
      setStatus(data.source === 'live' ? `Live: ${loc}` : `Mock: ${loc}`, '#22C55E')
      runSimulation()
    }
    btn.addEventListener('click', doSearch)
    input.addEventListener('keydown', e => e.key === 'Enter' && doSearch())
  }

  // Load default city on page load
  const defaultData = await fetchWeather('Bangalore')
  ambientTemp = defaultData.temp
  cityLat = defaultData.lat
  cityLon = defaultData.lon
}

function runSimulation() {
  const result = calculateTemperature(ambientTemp, params)
  const zones  = getZoneData(ambientTemp, params)
  const color  = getTemperatureColor(result.tAfter)

  // Update temp displays
  const beforeEl = document.getElementById('temp-before')
  const afterEl  = document.getElementById('temp-after')
  const redEl    = document.getElementById('reduction-val')

  if (beforeEl) beforeEl.textContent = `${result.tBefore}°C`
  if (afterEl) {
    afterEl.textContent = `${result.tAfter}°C`
    afterEl.style.color = color
  }
  if (redEl) {
    const badge = document.getElementById('reduction-badge')
    if (result.reduction >= 0) {
      badge.innerHTML = `▼ <span id="reduction-val">${result.reduction.toFixed(1)}</span>°C reduction`
      badge.style.color = '#22C55E'
      badge.style.borderColor = 'rgba(34,197,94,0.25)'
      badge.style.background = 'rgba(34,197,94,0.07)'
    } else {
      badge.innerHTML = `▲ <span id="reduction-val">${Math.abs(result.reduction).toFixed(1)}</span>°C increase`
      badge.style.color = '#F97316'
      badge.style.borderColor = 'rgba(249,115,22,0.25)'
      badge.style.background = 'rgba(249,115,22,0.07)'
    }
  }

  // Update chart or ticker
  if (useTicker) {
    updateTicker(zones.before, zones.after)
  } else if (chart) {
    updateChart(zones.before, zones.after)
  }

  // Update map
  if (simMap) updateMapOverlay(cityLat, cityLon, color, result.tAfter)

  // Note
  const note = document.getElementById('chart-note')
  if (note) note.textContent = `Δ ${result.reduction >= 0 ? '−' : '+'}${Math.abs(result.reduction).toFixed(1)}°C vs baseline`
}

function setStatus(text, color) {
  const el = document.getElementById('sim-status')
  if (!el) return
  el.textContent = text
  el.style.color = color
  el.style.borderColor = color.replace(')', ',0.25)').replace('rgb', 'rgba')
  el.style.background = color.replace(')', ',0.08)').replace('rgb', 'rgba')
}
