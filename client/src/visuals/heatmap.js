/**
 * Animated canvas heatmap background for the Hero section.
 * Optimised: fewer blobs, dot-grid removed (CSS handles it), 30fps cap.
 */
export function initHeatmapCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  let raf
  let lastTime = 0
  const TARGET_MS = 1000 / 30   // 30fps cap — imperceptible, halves GPU load

  const BLOB_COUNT = 5           // was 8
  let blobs = []

  function createBlobs(w, h) {
    return Array.from({ length: BLOB_COUNT }, (_, i) => ({
      x: (0.08 + (i / BLOB_COUNT) * 0.84) * w,
      y: (0.15 + Math.random() * 0.7) * h,
      r: 200 + Math.random() * 220,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.22,
      driftX: (Math.random() - 0.5) * 80,
      driftY: (Math.random() - 0.5) * 60,
      colorIdx: i % 2
    }))
  }

  function resize() {
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    blobs = createBlobs(canvas.width, canvas.height)
  }

  window.addEventListener('resize', resize, { passive: true })
  resize()

  let t = 0

  function render(now) {
    raf = requestAnimationFrame(render)

    // 30fps throttle
    if (now - lastTime < TARGET_MS) return
    lastTime = now

    const { width: W, height: H } = canvas

    ctx.fillStyle = '#020617'
    ctx.fillRect(0, 0, W, H)

    // Heat blobs — fewer radial gradients, no per-pixel dot loop
    for (const b of blobs) {
      const x = b.x + Math.sin(t * b.speed + b.phase) * b.driftX
      const y = b.y + Math.cos(t * b.speed * 0.65 + b.phase) * b.driftY

      const inner = b.colorIdx === 0 ? 'rgba(249,115,22,0.2)' : 'rgba(251,113,133,0.16)'
      const mid   = b.colorIdx === 0 ? 'rgba(249,115,22,0.07)' : 'rgba(251,113,133,0.06)'

      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r)
      g.addColorStop(0,    inner)
      g.addColorStop(0.5,  mid)
      g.addColorStop(1,    'rgba(2,6,23,0)')

      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }

    // Dot grid is now handled purely by CSS .city-grid-overlay (zero JS cost)

    t += 0.007
  }

  raf = requestAnimationFrame(render)

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
  }
}
