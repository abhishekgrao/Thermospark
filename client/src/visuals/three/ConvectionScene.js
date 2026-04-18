/**
 * ConvectionScene — Three.js scene for Section 5 (Convection)
 *
 * Concept:
 * A 3D city canyon. Free-flowing cyan air outside the canyon.
 * Inside, hot orange air rises but gets trapped by an inversion layer.
 */
import * as THREE from 'three'
import { BaseScene, smoothstep } from './BaseScene.js'

export class ConvectionScene extends BaseScene {
  constructor(canvas) {
    super(canvas)
    this._progress = 0
    this._buildScene()
  }

  _buildScene() {
    const s = this.scene

    this.SCENE_H = 120
    
    // Positioning
    this.camera.position.set(0, 10, 180)
    // slight angle down
    this.camera.lookAt(0, -10, 0)

    // Lights
    s.add(new THREE.AmbientLight(0x0a1628, 1))
    const dl = new THREE.DirectionalLight(0x1e293b, 1.5)
    dl.position.set(0, 100, 50)
    s.add(dl)

    // ── Buildings (City Canyon) ──
    const bGeo = new THREE.BoxGeometry(60, 200, 40)
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.2
    })
    
    const leftBldg = new THREE.Mesh(bGeo, bMat)
    leftBldg.position.set(-60, -20, 0)
    s.add(leftBldg)
    
    const rightBldg = new THREE.Mesh(bGeo, bMat)
    rightBldg.position.set(60, -20, 0)
    s.add(rightBldg)

    // Adds some simple window textures
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xf97316, wireframe: true, transparent: true, opacity: 0.05 })
    s.add(new THREE.Mesh(bGeo, wireMat).copy(leftBldg))
    s.add(new THREE.Mesh(bGeo, wireMat).copy(rightBldg))

    // ── Particles: Free Air (Cyan) ──
    const FREE_COUNT = 300
    this.freePos = new Float32Array(FREE_COUNT * 3)
    for(let i = 0; i < FREE_COUNT; i++) {
        // Outside the canyon (-120 to -35) and (35 to 120)
        let x = (Math.random() * 85) + 35
        if (Math.random() > 0.5) x *= -1
        
        this.freePos[i*3] = x
        this.freePos[i*3+1] = (Math.random() - 0.5) * this.SCENE_H * 2
        this.freePos[i*3+2] = (Math.random() - 0.5) * 60
    }
    this.freeGeo = new THREE.BufferGeometry()
    this.freeGeo.setAttribute('position', new THREE.BufferAttribute(this.freePos, 3))
    
    const freeMat = new THREE.PointsMaterial({
      color: 0x38BDF8, size: 2.2, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    this.freePoints = new THREE.Points(this.freeGeo, freeMat)
    s.add(this.freePoints)

    // ── Particles: Trapped Heat (Orange) ──
    const TRAPPED_COUNT = 250
    this.trappedPos = new Float32Array(TRAPPED_COUNT * 3)
    this.trappedVel = [] // per particle velocities (dx, dy)
    
    for(let i = 0; i < TRAPPED_COUNT; i++) {
      this.trappedPos[i*3] = (Math.random() - 0.5) * 50 // inside canyon
      this.trappedPos[i*3+1] = -40 + Math.random() * 20
      this.trappedPos[i*3+2] = (Math.random() - 0.5) * 30
      
      this.trappedVel.push({
        dx: (Math.random() - 0.5) * 0.4,
        dy: 0.3 + Math.random() * 0.4
      })
    }
    
    this.trappedGeo = new THREE.BufferGeometry()
    this.trappedGeo.setAttribute('position', new THREE.BufferAttribute(this.trappedPos, 3))
    
    const trappedMat = new THREE.PointsMaterial({
      color: 0xF97316, size: 2.8, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    this.trappedPoints = new THREE.Points(this.trappedGeo, trappedMat)
    s.add(this.trappedPoints)

    // ── Inversion Layer / Heat Glow Ambient ──
    const planeGeo = new THREE.PlaneGeometry(60, 200)
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xF97316, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
    this.inversionPlane = new THREE.Mesh(planeGeo, planeMat)
    this.inversionPlane.rotation.x = Math.PI / 2
    this.inversionPlane.position.set(0, 0, 0)
    s.add(this.inversionPlane)

    const glowBoxGeo = new THREE.BoxGeometry(60, 200, 40)
    const glowBoxMat = new THREE.MeshBasicMaterial({
      color: 0xF97316, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide
    })
    this.glowBox = new THREE.Mesh(glowBoxGeo, glowBoxMat)
    // Anchor box bottom down in canyon
    this.glowBox.position.set(0, -60, 0)
    s.add(this.glowBox)
  }

  update(progress) {
    this._progress = progress
    
    // Inversion layer drops down and glow intensifies as progress increases
    const ceilY = THREE.MathUtils.lerp(60, -20, progress)
    this.inversionPlane.position.y = ceilY
    
    this.inversionPlane.material.opacity = smoothstep(progress, 0.1, 0.9) * 0.4
    this.glowBox.material.opacity = smoothstep(progress, 0.1, 0.9) * 0.12
    
    // Slow camera rotation for depth
    this.camera.position.x = THREE.MathUtils.lerp(0, 20, progress)
    this.camera.lookAt(0, -10, 0)
  }

  onFrame() {
    // Continuous animation for particles
    
    // Free air rises continuously
    for (let i = 0; i < this.freePos.length / 3; i++) {
      let y = this.freePos[i*3+1] + 1.2
      if (y > this.SCENE_H) {
        y = -this.SCENE_H
      }
      this.freePos[i*3+1] = y
    }
    this.freeGeo.attributes.position.needsUpdate = true

    // Trapped air rises, hits ceiling, swirls
    const ceilY = this.inversionPlane.position.y
    
    for (let i = 0; i < this.trappedPos.length / 3; i++) {
      let x = this.trappedPos[i*3]
      let y = this.trappedPos[i*3+1]
      const vel = this.trappedVel[i]
      
      x += vel.dx
      y += vel.dy
      
      // Hit canyon walls
      if (x < -28 || x > 28) {
        vel.dx *= -1
        x = Math.max(-28, Math.min(28, x))
      }
      
      // Hit inversion ceiling
      if (y > ceilY) {
         // Push down and swirl
         y = ceilY - Math.random() * 5
         vel.dy = -0.1 - Math.random() * 0.2 // fall slowly
         vel.dx += (Math.random() - 0.5) * 0.5 // swirl laterally
      } 
      // If falling too far down, float back up
      else if (y < -60) {
         y = -60
         vel.dy = 0.3 + Math.random() * 0.5
      } 
      // General buoyancy -> tends towards positive dy
      else {
         vel.dy += 0.01 
         if (vel.dy > 1.0) vel.dy = 1.0 // max speed
      }
      
      // Mild damping on lateral motion
      vel.dx *= 0.99
      
      this.trappedPos[i*3] = x
      this.trappedPos[i*3+1] = y
    }
    this.trappedGeo.attributes.position.needsUpdate = true
  }
}
