import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initConvection() {
  const container = document.getElementById('convection-scene')
  if (!container) return

  container.innerHTML = buildConvectionSVG()

  // Activate label
  ScrollTrigger.create({
    trigger: '#s5',
    start: 'top 70%',
    onEnter: () => document.getElementById('label-convection')?.classList.add('active'),
  })

  gsap.from('#physics-text-5', {
    autoAlpha: 0, x: 60, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#s5', start: 'top 70%' },
  })

  // Animate arrows rising and being blocked
  ScrollTrigger.create({
    trigger: '#s5',
    start: 'top 75%',
    onEnter: () => animateConvectionArrows(container),
  })

  // Heat glow intensifies with scroll
  ScrollTrigger.create({
    trigger: '#s5',
    start: 'top 60%',
    end: 'bottom 30%',
    scrub: 1.5,
    onUpdate(self) {
      const p = self.progress
      container.querySelectorAll('.bldg-conv').forEach(b => {
        const glowR = Math.round(20 + p * 240)
        b.setAttribute('filter', `drop-shadow(0 0 ${glowR * 0.2}px rgba(249,115,22,${(p * 0.7).toFixed(2)}))`)
      })
    },
  })
}

function animateConvectionArrows(container) {
  const freeArrows = container.querySelectorAll('.arrow-free')
  const blockedArrows = container.querySelectorAll('.arrow-blocked')

  // Free arrows flow up and loop
  freeArrows.forEach((a, i) => {
    gsap.fromTo(a,
      { attr: { y: parseInt(a.getAttribute('y')) }, opacity: 0 },
      {
        attr: { y: parseInt(a.getAttribute('y')) - 120 },
        opacity: 1,
        duration: 2.5 + i * 0.4,
        repeat: -1,
        ease: 'power1.inOut',
        delay: i * 0.3,
        yoyo: false,
        repeatDelay: 0.5,
      }
    )
  })

  // Blocked arrows stutter and stop
  blockedArrows.forEach((a, i) => {
    gsap.fromTo(a,
      { attr: { y: parseInt(a.getAttribute('y')) }, opacity: 0 },
      {
        attr: { y: parseInt(a.getAttribute('y')) - 40 },
        opacity: 0.7,
        duration: 1.2,
        ease: 'power2.out',
        delay: 0.5 + i * 0.2,
        onComplete: () => {
          gsap.to(a, { opacity: 0, duration: 0.5, delay: 0.3 })
        },
      }
    )
  })
}

function buildConvectionSVG() {
  const W = 1440, H = 700
  const GH = H * 0.95  // ground y

  // Two tall buildings forming a canyon
  const leftB  = { x: 0.12, w: 0.22, h: 0.85 }
  const rightB = { x: 0.66, w: 0.22, h: 0.85 }
  // Canyon = from 0.34 to 0.66 (32% width)
  const canyonX = leftB.x * W + leftB.w * W
  const canyonW = rightB.x * W - canyonX

  function buildingRect(b) {
    const bx = b.x * W
    const bh = b.h * H
    const by = GH - bh
    const bw = b.w * W
    const wCols = Math.floor((bw - 8) / 14)
    const wFloors = Math.floor(bh / 24)
    const wins = Array.from({ length: wFloors }, (_, fi) =>
      Array.from({ length: wCols }, (_, wi) =>
        `<rect x="${(bx + 4 + wi * 14).toFixed(1)}" y="${(by + 5 + fi * 24).toFixed(1)}"
          width="9" height="14" fill="rgba(252,211,77,0.25)" rx="1"/>`
      ).join('')
    ).join('')
    return `
      <rect class="bldg-conv" x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#1E293B" rx="2"
        stroke="rgba(249,115,22,0.15)" stroke-width="1"/>
      ${wins}
      <rect x="${bx}" y="${by}" width="${bw}" height="5" fill="rgba(249,115,22,0.5)" rx="1"/>`
  }

  // Airflow arrows — free (outside canyon)
  const freeArrowXs = [0.05 * W, 0.95 * W]
  const freeArrows = freeArrowXs.flatMap(ax =>
    [0.5, 0.65, 0.8].map(yFrac => {
      const ay = GH * yFrac
      return `<text class="arrow-free" x="${ax}" y="${ay}" text-anchor="middle"
        font-size="28" fill="${ax < W / 2 ? 'rgba(56,189,248,0.8)' : 'rgba(56,189,248,0.8)'}">↑</text>`
    })
  ).join('')

  // Blocked arrows inside canyon – they try to rise but can't escape
  const blockedArrows = [0.38, 0.50, 0.62].map(xFrac => {
    const ax = xFrac * W
    return `<text class="arrow-blocked" x="${ax}" y="${GH * 0.75}" text-anchor="middle"
      font-size="22" fill="rgba(249,115,22,0.7)">↑</text>`
  }).join('')

  // Heat accumulation rings in canyon
  const heatRings = [1, 2, 3].map(i =>
    `<ellipse cx="${(canyonX + canyonW / 2).toFixed(1)}" cy="${(GH * 0.85).toFixed(1)}"
      rx="${(canyonW * 0.35 + i * 10).toFixed(1)}" ry="${(20 + i * 12).toFixed(1)}"
      fill="none" stroke="rgba(249,115,22,${(0.3 - i * 0.08).toFixed(2)})" stroke-width="2"
      class="heat-ring"/>`
  ).join('')

  // "BLOCKED" label
  const blockedLabel = `
    <text x="${(canyonX + canyonW / 2).toFixed(1)}" y="${(GH * 0.45).toFixed(1)}"
      text-anchor="middle" font-family="Inter" font-size="13" font-weight="700"
      fill="rgba(251,113,133,0.6)" letter-spacing="4">HEAT TRAPPED</text>`

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <rect width="${W}" height="${H}" fill="#0F172A"/>
      <rect x="0" y="${GH}" width="${W}" height="${H * 0.05}" fill="#0a1628"/>

      ${buildingRect(leftB)}
      ${buildingRect(rightB)}

      <!-- Canyon heat overlay -->
      <rect x="${canyonX.toFixed(1)}" y="0" width="${canyonW.toFixed(1)}" height="${H}"
        fill="rgba(249,115,22,0.04)"/>
      ${heatRings}
      ${blockedLabel}

      ${freeArrows}
      ${blockedArrows}
    </svg>`
}
