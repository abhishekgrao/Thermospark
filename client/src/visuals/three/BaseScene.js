/**
 * BaseScene — shared WebGL renderer/camera/resize boilerplate.
 * All Three.js scenes extend this.
 */
import * as THREE from 'three'

export class BaseScene {
  constructor(canvas) {
    this.canvas = canvas

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.setClearColor(0x000000, 0)

    this.scene  = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000)

    // Initial size
    this._resize()

    // Watch parent for size changes
    this._ro = new ResizeObserver(() => this._resize())
    this._ro.observe(canvas.parentElement ?? canvas)

    // Render loop
    this._running = true
    this._tick = this._tick.bind(this)
    this._raf = requestAnimationFrame(this._tick)
  }

  _resize() {
    const el = this.canvas.parentElement ?? this.canvas
    const w  = el.clientWidth  || window.innerWidth
    const h  = el.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.onResize(w, h)
  }

  // Override in subclass
  onResize(_w, _h) {}

  _tick() {
    if (!this._running) return
    this._raf = requestAnimationFrame(this._tick)
    this.onFrame()
    this.renderer.render(this.scene, this.camera)
  }

  // Override in subclass for per-frame logic
  onFrame() {}

  // Called by scroll handler with 0..1 progress
  update(_progress) {}

  destroy() {
    this._running = false
    cancelAnimationFrame(this._raf)
    this._ro.disconnect()
    this.renderer.dispose()
  }
}

// Utility: smooth-step remapping
export function smoothstep(x, edge0, edge1) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
