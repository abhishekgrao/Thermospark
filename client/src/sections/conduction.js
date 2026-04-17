import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initConduction() {
  const canvas = document.getElementById('conduction-canvas')
  if (!canvas) return

  canvas.width = canvas.clientWidth || window.innerWidth
  canvas.height = canvas.clientHeight || window.innerHeight

  window.addEventListener('resize', () => {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    drawFrame(lastProgress)
  }, { passive: true })

  const ctx = canvas.getContext('2d')
  let lastProgress = 0

  const COLS = 36
  const ROWS = 20

  function lerpColor(t) {
    // cool #1E293B → warm #FCD34D → hot #F97316
    if (t < 0.5) {
      const s = t * 2
      return [
        Math.round(30 + s * 222),   // r: 30 → 252
        Math.round(41 + s * 170),   // g: 41 → 211
        Math.round(59 - s * 18),    // b: 59 → 41
      ]
    } else {
      const s = (t - 0.5) * 2
      return [
        Math.round(252 - s * 3),    // r: 252 → 249
        Math.round(211 - s * 96),   // g: 211 → 115
        Math.round(41 - s * 22),    // b: 41 → 19
      ]
    }
  }

  function drawFrame(progress) {
    const { width: W, height: H } = canvas
    const cellW = W / COLS
    const cellH = H / ROWS
    const wavePos = progress * (COLS + 8) - 4

    // Background
    ctx.fillStyle = '#0a1628'
    ctx.fillRect(0, 0, W, H)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dist = col - wavePos
        // Sigmoid-like heat distribution
        const t = Math.max(0, Math.min(1, 1 - dist / 7))
        const [r, g, b] = lerpColor(t)

        // Cell fill
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(col * cellW + 1, row * cellH + 1, cellW - 2, cellH - 2)

        // Grid lines
        ctx.strokeStyle = 'rgba(2,6,23,0.8)'
        ctx.lineWidth = 1
        ctx.strokeRect(col * cellW, row * cellH, cellW, cellH)
      }
    }

    // Heat wave leading edge glow
    if (wavePos > 0 && wavePos < COLS) {
      const edgeX = wavePos * cellW
      const grad = ctx.createLinearGradient(edgeX - 30, 0, edgeX + 15, 0)
      grad.addColorStop(0, 'rgba(249,115,22,0)')
      grad.addColorStop(0.7, 'rgba(249,115,22,0.3)')
      grad.addColorStop(1, 'rgba(252,211,77,0.5)')
      ctx.fillStyle = grad
      ctx.fillRect(edgeX - 30, 0, 45, H)
    }
  }

  drawFrame(0)

  // Activate label underline
  ScrollTrigger.create({
    trigger: '#s4',
    start: 'top 70%',
    onEnter: () => document.getElementById('label-conduction')?.classList.add('active'),
  })

  // Physics text
  gsap.from('#physics-text-4', {
    autoAlpha: 0, x: 60, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#s4', start: 'top 70%' },
  })

  // Scrubbed heat wave
  ScrollTrigger.create({
    trigger: '#s4',
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: 2,
    onUpdate(self) {
      lastProgress = self.progress
      drawFrame(lastProgress)
    },
  })
}
