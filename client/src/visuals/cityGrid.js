/**
 * Creates an inline SVG isometric-style city skyline
 * for the Problem section.
 */
export function createCityGrid(container) {
  const W = 600
  const H = 400

  const buildings = [
    { x: 0.02, w: 0.10, h: 0.52, floors: 7,  lit: 0.4 },
    { x: 0.14, w: 0.13, h: 0.78, floors: 11, lit: 0.6 },
    { x: 0.29, w: 0.09, h: 0.44, floors: 6,  lit: 0.3 },
    { x: 0.40, w: 0.16, h: 0.92, floors: 14, lit: 0.7 },
    { x: 0.58, w: 0.11, h: 0.65, floors: 9,  lit: 0.5 },
    { x: 0.71, w: 0.08, h: 0.38, floors: 5,  lit: 0.2 },
    { x: 0.81, w: 0.14, h: 0.80, floors: 12, lit: 0.65 },
  ]

  const bSVG = buildings.map((b, i) => {
    const bx = b.x * W
    const bh = b.h * H * 0.95
    const by = H * 0.96 - bh
    const bw = b.w * W
    const floorH = bh / b.floors

    // Windows
    const winCols = Math.floor((bw - 8) / 12)
    const windows = Array.from({ length: b.floors - 1 }, (_, fi) =>
      Array.from({ length: winCols }, (_, wi) => {
        const wx = bx + 4 + wi * 12
        const wy = by + 5 + fi * floorH
        const isLit = Math.random() < b.lit
        return `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="8" height="${(floorH * 0.55).toFixed(1)}"
          fill="${isLit ? 'rgba(252,211,77,0.55)' : 'rgba(15,23,42,0.6)'}" rx="1"/>`
      }).join('')
    ).join('')

    return `
      <g class="bldg-grp">
        <rect class="building-svg" x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"
          fill="#1E293B" stroke="rgba(249,115,22,0.12)" stroke-width="0.8" rx="2"/>
        ${windows}
        <!-- rooftop glow bar -->
        <rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="4"
          fill="rgba(249,115,22,0.4)" rx="1"/>
      </g>`
  }).join('')

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
      <defs>
        <linearGradient id="cityHaze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#F97316" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
        </linearGradient>
        <radialGradient id="groundGlow" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stop-color="#F97316" stop-opacity="0.12"/>
          <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
        </radialGradient>
      </defs>

      <!-- Ground -->
      <rect x="0" y="${H * 0.96}" width="${W}" height="${H * 0.04}" fill="#0F172A"/>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#groundGlow)"/>

      ${bSVG}

      <!-- Heat haze overlay -->
      <rect x="0" y="${H * 0.35}" width="${W}" height="${H * 0.6}" fill="url(#cityHaze)" opacity="0.8" class="heat-overlay"/>
    </svg>`
}
