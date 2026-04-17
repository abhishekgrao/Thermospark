/**
 * Animated canvas heatmap background for the Hero section.
 * Renders slow-drifting radial heat blobs with a dot grid overlay.
 */
export function initHeatmapCanvas(canvas) {
  const ctx = canvas.getContext('2d')
  let raf

  const BLOB_COUNT = 8
  let blobs = []

  function createBlobs(w, h) {
    return Array.from({ length: BLOB_COUNT }, (_, i) => ({
      x: (0.05 + (i / BLOB_COUNT) * 0.9) * w,
      y: (0.15 + Math.random() * 0.7) * h,
      r: 170 + Math.random() * 230,
      phase: Math.random() * Math.PI * 2,
      speed: 0.18 + Math.random() * 0.3,
      driftX: (Math.random() - 0.5) * 90,
      driftY: (Math.random() - 0.5) * 70,
      colorIdx: i % 2  // 0 = orange, 1 = red
    }))
  }

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    blobs = createBlobs(canvas.width, canvas.height)
  }

  window.addEventListener('resize', resize, { passive: true })
  resize()

  let t = 0

  function render() {
    const { width: W, height: H } = canvas

    ctx.fillStyle = '#020617'
    ctx.fillRect(0, 0, W, H)

    // Heat blobs
    for (const b of blobs) {
      const x = b.x + Math.sin(t * b.speed + b.phase) * b.driftX
      const y = b.y + Math.cos(t * b.speed * 0.65 + b.phase) * b.driftY

      const inner = b.colorIdx === 0 ? 'rgba(249,115,22,0.22)' : 'rgba(251,113,133,0.18)'
      const mid   = b.colorIdx === 0 ? 'rgba(249,115,22,0.08)' : 'rgba(251,113,133,0.07)'

      const g = ctx.createRadialGradient(x, y, 0, x, y, b.r)
      g.addColorStop(0,   inner)
      g.addColorStop(0.45, mid)
      g.addColorStop(1,   'rgba(2,6,23,0)')

      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }

    // Dot grid with pulsing opacity
    const GRID = 64
    for (let gx = 0; gx < W; gx += GRID) {
      for (let gy = 0; gy < H; gy += GRID) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.6 + gx * 0.025 + gy * 0.025)
        ctx.globalAlpha = pulse * 0.35
        ctx.fillStyle = 'rgba(249,115,22,1)'
        ctx.beginPath()
        ctx.arc(gx, gy, 1.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    t += 0.007
    raf = requestAnimationFrame(render)
  }

  render()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
  }
}
