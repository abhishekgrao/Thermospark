/**
 * Impact Ticker — Infinite scroll temperature comparison display
 * Replaces the static Chart.js bar chart on the simulator page.
 */

const ZONES = [
  'Urban Core',
  'Commercial',
  'Residential',
  'Parks',
  'Industrial',
  'Transit Hub',
  'Waterfront',
  'Suburbs',
]

// Max temperature for normalising bar widths
const MAX_TEMP = 50

let tickerEl = null
let tickerAnimFrame = null
let currentBefore = [43, 41, 39.5, 36, 44, 40, 35, 33]
let currentAfter  = [43, 41, 39.5, 36, 44, 40, 35, 33]

export function initTicker(tickerId) {
  tickerEl = document.getElementById(tickerId)
  if (!tickerEl) return

  buildRows()
  startScroll()
}

export function updateTicker(beforeData, afterData) {
  if (!tickerEl) return

  // Extend arrays to ZONES length (fill missing with scaled values)
  currentBefore = ZONES.map((_, i) => beforeData[i] ?? beforeData[beforeData.length - 1] ?? 36)
  currentAfter  = ZONES.map((_, i) => afterData[i]  ?? afterData[afterData.length - 1]  ?? 36)

  refreshBars()
  updateLiveBadge()
}

/* ── Build the ticker rows (doubled for seamless loop) ── */
function buildRows() {
  // Build one set of rows, then duplicate for infinite feel
  const html = buildRowsHTML() + buildRowsHTML() // doubled
  tickerEl.innerHTML = html
}

function buildRowsHTML() {
  return ZONES.map((zone, i) => {
    const before = currentBefore[i] ?? 36
    const after  = currentAfter[i]  ?? 36
    const bPct   = Math.min((before / MAX_TEMP) * 100, 100).toFixed(1)
    const aPct   = Math.min((after  / MAX_TEMP) * 100, 100).toFixed(1)
    return `
      <div class="ticker-row" data-zone-index="${i}">
        <span class="ticker-zone">${zone}</span>
        <div class="ticker-bar-wrap">
          <div class="ticker-bar-before" style="width:${bPct}%"></div>
          <div class="ticker-bar-after"  style="width:${aPct}%"></div>
        </div>
        <div class="ticker-temps">
          <span class="ticker-temp-before">${before.toFixed(1)}°</span>
          <span class="ticker-temp-after">${after.toFixed(1)}°</span>
        </div>
      </div>`
  }).join('')
}

/* ── Refresh bar widths + temp labels after slider changes ── */
function refreshBars() {
  if (!tickerEl) return
  const rows = tickerEl.querySelectorAll('.ticker-row')
  rows.forEach(row => {
    const i = parseInt(row.dataset.zoneIndex, 10)
    const before = currentBefore[i] ?? 36
    const after  = currentAfter[i]  ?? 36
    const bPct = Math.min((before / MAX_TEMP) * 100, 100).toFixed(1)
    const aPct = Math.min((after  / MAX_TEMP) * 100, 100).toFixed(1)

    const barBefore = row.querySelector('.ticker-bar-before')
    const barAfter  = row.querySelector('.ticker-bar-after')
    const tempBefore = row.querySelector('.ticker-temp-before')
    const tempAfter  = row.querySelector('.ticker-temp-after')

    if (barBefore) barBefore.style.width = `${bPct}%`
    if (barAfter)  barAfter.style.width  = `${aPct}%`
    if (tempBefore) tempBefore.textContent = `${before.toFixed(1)}°`
    if (tempAfter)  tempAfter.textContent  = `${after.toFixed(1)}°`
  })
}

/* ── Infinite CSS scroll animation ── */
function startScroll() {
  if (!tickerEl) return
  // Speed: seconds to scroll one full set (ZONES.length rows)
  const speed = ZONES.length * 0.9 // ~7 seconds for 8 zones

  tickerEl.style.animation = `tickerScroll ${speed}s linear infinite`
}

/* ── Update live delta badge ── */
function updateLiveBadge() {
  const badge = document.getElementById('live-delta')
  if (!badge) return

  const avgBefore = currentBefore.reduce((a, b) => a + b, 0) / currentBefore.length
  const avgAfter  = currentAfter.reduce((a, b) => a + b, 0) / currentAfter.length
  const delta = avgBefore - avgAfter

  if (delta >= 0) {
    badge.textContent = `−${delta.toFixed(1)}°C avg`
    badge.style.color = 'var(--cool-green)'
  } else {
    badge.textContent = `+${Math.abs(delta).toFixed(1)}°C avg`
    badge.style.color = 'var(--heat-orange)'
  }
}
