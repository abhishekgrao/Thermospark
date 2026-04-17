import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const W = 1440
const H = 700

const BUILDINGS = [
  { x: 0.03, w: 0.10, h: 0.55 },
  { x: 0.15, w: 0.13, h: 0.75 },
  { x: 0.30, w: 0.09, h: 0.47 },
  { x: 0.41, w: 0.16, h: 0.88 },
  { x: 0.59, w: 0.11, h: 0.63 },
  { x: 0.72, w: 0.09, h: 0.42 },
]

export function initRadiation() {
  const container = document.getElementById('radiation-scene')
  if (!container) return

  container.innerHTML = buildSVG()

  // Activate label underline
  ScrollTrigger.create({
    trigger: '#s3',
    start: 'top 70%',
    onEnter: () => document.getElementById('label-radiation')?.classList.add('active'),
  })

  // Physics text entrance
  gsap.from('#physics-text-3', {
    autoAlpha: 0, x: 60, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#s3', start: 'top 70%' },
  })

  // Scroll-linked ray animation
  ScrollTrigger.create({
    trigger: '#s3',
    start: 'top 80%',
    end: 'bottom 15%',
    scrub: 1.8,
    onUpdate(self) {
      const p = self.progress
      const scene = document.getElementById('radiation-scene')
      if (!scene) return

      // Animate rays (strokeDashoffset → 0)
      scene.querySelectorAll('.sun-ray').forEach(ray => {
        const len = parseFloat(ray.dataset.len || 0)
        ray.setAttribute('stroke-dashoffset', (len * (1 - p)).toFixed(1))
        ray.setAttribute('opacity', (p * 0.85).toFixed(2))
      })

      // Heat buildings from dark slate → orange
      scene.querySelectorAll('.bldg-r').forEach(b => {
        const r = Math.round(30 + p * 219)
        const g = Math.round(41 + p * 74)
        const bl = Math.max(19, Math.round(59 - p * 40))
        b.setAttribute('fill', `rgb(${r},${g},${bl})`)
      })

      // Sun pulse glow
      const sun = scene.querySelector('.sun-circle')
      if (sun) {
        const glow = 20 + p * 45
        const op = 0.45 + p * 0.55
        sun.setAttribute('filter', `drop-shadow(0 0 ${glow}px rgba(252,211,77,${op.toFixed(2)}))`)
      }

      // Roof glow bars
      scene.querySelectorAll('.roof-glow').forEach(r => {
        r.setAttribute('opacity', (p * 0.9).toFixed(2))
      })
    },
  })
}

function buildSVG() {
  const sunX = W * 0.82
  const sunY = H * 0.12
  const sunR = 58

  const bSVG = BUILDINGS.map((b, i) => {
    const bx = b.x * W
    const bh = b.h * H
    const by = H * 0.94 - bh
    const bw = b.w * W
    const topX = bx + bw / 2
    const len = Math.hypot(topX - sunX, by - sunY)

    return `
      <line class="sun-ray" data-len="${len.toFixed(1)}"
        x1="${sunX}" y1="${sunY}" x2="${topX}" y2="${by}"
        stroke="rgba(252,211,77,0.8)" stroke-width="2.5"
        stroke-dasharray="${len.toFixed(1)}" stroke-dashoffset="${len.toFixed(1)}"
        opacity="0"/>
      <rect class="bldg-r" x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#1E293B" rx="2"/>
      ${Array.from({ length: Math.floor(bh / 22) }, (_, fi) =>
        `<rect x="${bx + 4}" y="${by + 6 + fi * 22}" width="${bw - 8}" height="12"
           fill="rgba(252,211,77,0.12)" rx="1"/>`
      ).join('')}
      <rect class="roof-glow" x="${bx}" y="${by}" width="${bw}" height="5"
        fill="rgba(249,115,22,0.8)" rx="1" opacity="0"/>
    `
  }).join('')

  return `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FCD34D" stop-opacity="0.5"/>
          <stop offset="60%" stop-color="#F97316" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="#020617" opacity="0.85"/>
      <rect x="0" y="${H * 0.94}" width="${W}" height="${H * 0.06}" fill="#0F172A"/>
      <!-- Sun aura -->
      <circle cx="${sunX}" cy="${sunY}" r="${sunR * 2.8}" fill="url(#sunAura)"/>
      <!-- Sun -->
      <circle class="sun-circle" cx="${sunX}" cy="${sunY}" r="${sunR}" fill="#FCD34D"
        style="animation: glow-pulse 2s ease-in-out infinite"/>
      ${bSVG}
    </svg>`
}
