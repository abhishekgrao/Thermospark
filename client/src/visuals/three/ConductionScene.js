/**
 * ConductionScene — Three.js scene for Section 4 (Conduction)
 *
 * Concept:
 * InstancedMesh grid of 240 bricks. A heat wave sweeps left-to-right.
 * Bricks change color from cool slate to hot orange dynamically.
 */
import * as THREE from 'three'
import { BaseScene, smoothstep } from './BaseScene.js'

export class ConductionScene extends BaseScene {
  constructor(canvas) {
    super(canvas)
    
    this._progress = 0
    this._color = new THREE.Color()
    
    this.COLS = 32
    this.ROWS = 18
    
    this._buildScene()
  }

  _buildScene() {
    const s = this.scene

    // Setup camera for a mostly flat isometric/orthographic feel
    this.camera.position.set(0, 0, 180)
    
    // Lights
    s.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(100, 100, 50)
    s.add(dirLight)

    // Brick Grid using InstancedMesh
    const bW = 6
    const bH = 3.5
    const bD = 8
    const gap = 0.4

    const totalW = this.COLS * bW
    const totalH = this.ROWS * bH

    const geometry = new THREE.BoxGeometry(bW - gap, bH - gap, bD)
    
    // We use a Standard material but will override colors per-instance
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, // base color, will be multiplied by instanceColor
      roughness: 0.9,
      metalness: 0.1
    })

    this.mesh = new THREE.InstancedMesh(geometry, material, this.COLS * this.ROWS)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.COLS * this.ROWS * 3), 3
    )

    const dummy = new THREE.Object3D()
    
    let i = 0
    // Generate brick grid layout
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        // Offset rows slightly for a brick bond pattern (optional, makes it look more like bricks)
        const offset = (row % 2 === 0) ? 0 : (bW / 2)
        const x = (col * bW) - (totalW / 2) + offset
        const y = (row * bH) - (totalH / 2)
        
        dummy.position.set(x, y, 0)
        dummy.updateMatrix()
        
        this.mesh.setMatrixAt(i, dummy.matrix)
        
        // Initial color (blue)
        this._color.setHex(0x3B82F6)
        this.mesh.setColorAt(i, this._color)
        
        i++
      }
    }
    
    s.add(this.mesh)

    // Leading edge glow (Shader plane)
    const glowGeo = new THREE.PlaneGeometry(120, totalH * 1.5)
    // Custom shader for a soft leading edge glow
    const glowMat = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0xF97316) },
        opacity: { value: 0.0 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying vec2 vUv;
        void main() {
          // Sharp falloff on right edge, smooth on left
          float alpha = smoothstep(0.0, 0.8, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          gl_FragColor = vec4(color, alpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
    
    this.glowPlane = new THREE.Mesh(glowGeo, glowMat)
    this.glowPlane.position.set(0, 0, bD/2 + 0.1) // Just in front of bricks
    s.add(this.glowPlane)
  }

  update(progress) {
    this._progress = progress
    
    // Wave position logic
    // progress 0 = far left, progress 1 = far right
    const waveX = progress * (this.COLS + 6) - 3
    
    let i = 0
    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const dist = col - waveX
        
        // Calculate heat (0 = cool slate, 1 = hot orange)
        // Heat is high behind the wave, drops off sharply ahead
        const t = Math.max(0, Math.min(1, 1 - dist / 5))
        
        // Color lerp: Blue -> Orangish Red
        const coolC = new THREE.Color(0x3B82F6)
        const hotC = new THREE.Color(0xf25c05)
        this._color.lerpColors(coolC, hotC, t)
        
        this.mesh.setColorAt(i, this._color)
        i++
      }
    }
    
    // Upload color changes to GPU
    this.mesh.instanceColor.needsUpdate = true
    
    // Update glow plane position
    const totalW = this.COLS * 6
    const glowPosX = (waveX * 6) - (totalW / 2)
    this.glowPlane.position.x = glowPosX - 20
    
    // Only show glow when wave is actively crossing
    const isActivelyCrossing = progress > 0.05 && progress < 0.95
    this.glowPlane.material.uniforms.opacity.value = isActivelyCrossing ? 0.7 : 0.0
    
    // Slight camera pan to follow the wave and give life
    this.camera.position.x = THREE.MathUtils.lerp(-10, 10, progress)
    this.camera.lookAt(this.camera.position.x, 0, 0)
  }
}
