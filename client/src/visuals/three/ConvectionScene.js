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
    this._gap = 0 // 0 = close, 1 = far
    this._buildScene()
  }

  setGap(val) {
    this._gap = val
  }

  _buildScene() {
    const s = this.scene

    this.SCENE_H = 120
    
    // Premium Isometric Camera setup
    this.camera.position.set(140, 90, 180)
    this.camera.lookAt(0, -10, 0)

    // Soft studio lighting
    s.add(new THREE.AmbientLight(0xffffff, 0.8)) // Brighter ambient
    
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.1)
    dirLight.position.set(50, 120, 80)
    s.add(dirLight)
    
    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 0.5)
    fillLight.position.set(-60, 40, -60)
    s.add(fillLight)

    // Premium white float pad
    const padGeo = new THREE.BoxGeometry(240, 4, 120)
    const padMat = new THREE.MeshStandardMaterial({ 
      color: 0xf8fafc, roughness: 0.7, metalness: 0.05 
    })
    const basePad = new THREE.Mesh(padGeo, padMat)
    basePad.position.set(0, -122, 0)
    s.add(basePad)

    // ── Buildings (City Canyon) ──
    const bGeo = new THREE.BoxGeometry(55, 200, 50)
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x3b5068, // Sleek slate blue
      roughness: 0.3,
      metalness: 0.2
    })
    
    this.leftBldg = new THREE.Mesh(bGeo, bMat)
    this.leftBldg.position.set(-60, -20, 0)
    s.add(this.leftBldg)
    
    this.rightBldg = new THREE.Mesh(bGeo, bMat)
    this.rightBldg.position.set(60, -20, 0)
    s.add(this.rightBldg)

    // Adds sleek horizontal window stripes look
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xcfd8dc, wireframe: true, transparent: true, opacity: 0.2 })
    this.leftBldg.add(new THREE.Mesh(bGeo, wireMat))
    this.rightBldg.add(new THREE.Mesh(bGeo, wireMat))

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
    // Slow camera pan for depth and parallax
    this.camera.position.x = THREE.MathUtils.lerp(120, 160, progress)
    this.camera.position.y = THREE.MathUtils.lerp(80, 100, progress)
    this.camera.lookAt(0, -10, 0)
  }

  onFrame() {
    const gap = this._gap;
    
    // Building animation
    const bCloseX = 35;
    const bFarX = 65;
    const targetX = THREE.MathUtils.lerp(bCloseX, bFarX, gap);
    this.leftBldg.position.x = -targetX;
    this.rightBldg.position.x = targetX;
    
    // Inversion layer drops down and glow intensifies as progress increases, but gap releases it
    const ceilY = THREE.MathUtils.lerp(60, -20, this._progress) + (gap * 80); // higher ceiling when gap is large
    this.inversionPlane.position.y = ceilY
    
    const baseOpacity = smoothstep(this._progress, 0.1, 0.9);
    this.inversionPlane.material.opacity = baseOpacity * 0.4 * (1 - gap);
    this.glowBox.material.opacity = baseOpacity * 0.12 * (1 - gap);
    
    // Continuous animation for particles
    
    // Free air rises continuously
    // When gap is open, blue air moves into the center
    for (let i = 0; i < this.freePos.length / 3; i++) {
      let x = this.freePos[i*3]
      let y = this.freePos[i*3+1] + 1.2 + (gap * 0.5) // move faster when open
      if (y > this.SCENE_H) {
        y = -this.SCENE_H
        // re-roll x to be in the gap if gap is wide
        if (gap > 0.5 && Math.random() > 0.5) {
          x = (Math.random() - 0.5) * targetX * 1.5;
        } else {
          x = (Math.random() * 85) + targetX + 10;
          if (Math.random() > 0.5) x *= -1;
        }
      }
      this.freePos[i*3] = x
      this.freePos[i*3+1] = y
    }
    this.freeGeo.attributes.position.needsUpdate = true

    // Trapped air rises, hits ceiling, swirls
    for (let i = 0; i < this.trappedPos.length / 3; i++) {
      let x = this.trappedPos[i*3]
      let y = this.trappedPos[i*3+1]
      const vel = this.trappedVel[i]
      
      x += vel.dx
      y += vel.dy
      
      // Hit canyon walls
      const wallLimit = targetX - 6;
      if (x < -wallLimit || x > wallLimit) {
        vel.dx *= -1
        x = Math.max(-wallLimit, Math.min(wallLimit, x))
      }
      
      // Hit inversion ceiling
      if (y > ceilY) {
         if (gap > 0.6) {
             // Escape! Keep rising
             y = ceilY;
             vel.dy = 1.0;
         } else {
             // Push down and swirl
             y = ceilY - Math.random() * 5
             vel.dy = -0.1 - Math.random() * 0.2 // fall slowly
             vel.dx += (Math.random() - 0.5) * 0.5 // swirl laterally
         }
      } 
      // If falling too far down, float back up or wrap if gap is open and it flew up
      else if (y < -60 || (y > this.SCENE_H)) {
         y = -60
         vel.dy = 0.3 + Math.random() * 0.5
      } 
      // General buoyancy -> tends towards positive dy, faster if wide gap
      else {
         vel.dy += 0.01 + (gap * 0.03) 
         if (vel.dy > (1.0 + gap)) vel.dy = (1.0 + gap) // max speed
      }
      
      // Mild damping on lateral motion
      vel.dx *= 0.99
      
      this.trappedPos[i*3] = x
      this.trappedPos[i*3+1] = y
    }
    this.trappedGeo.attributes.position.needsUpdate = true
  }
}
