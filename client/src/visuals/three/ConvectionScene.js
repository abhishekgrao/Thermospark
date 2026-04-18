/**
 * ConvectionScene — Three.js scene for Section 5 (Convection)
 *
 * Concept:
 * A 3D city canyon. Free-flowing cyan air outside the canyon.
 * Inside, hot orange air rises but gets trapped by an inversion layer.
 */
import * as THREE from 'three'
import { BaseScene, smoothstep } from './BaseScene.js'

// ── Helper: add windows to a building face ──
function addWindowsAndDoors(mesh, bw, bh, bD, s) {
  const winMat = new THREE.MeshStandardMaterial({
    color: 0x90caf9, roughness: 0.1, metalness: 0.9,
    emissive: new THREE.Color(0.05, 0.1, 0.3),
    emissiveIntensity: 0.5
  })
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1.0 })

  const cols  = 3
  const rows  = Math.floor(bh / 22)
  const stepX = bw / (cols + 1)
  const stepY = 22

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(7, 9, 1), winMat)
      win.position.set(
        -bw/2 + stepX * (c + 1),
        -bh/2 + stepY * r + 16,
        bD / 2 + 0.5
      )
      mesh.add(win)
    }
  }

  // Door on front face
  const door = new THREE.Mesh(new THREE.BoxGeometry(9, 16, 1), doorMat)
  door.position.set(0, -bh/2 + 8, bD / 2 + 0.5)
  mesh.add(door)

  // Side windows on the canyon-facing side
  const cols2 = 2
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols2; c++) {
      const sWin = new THREE.Mesh(new THREE.BoxGeometry(1, 9, 7), winMat.clone())
      sWin.position.set(
        bw / 2 + 0.5,
        -bh/2 + stepY * r + 16,
        -bD/2 + (c + 1) * bD / (cols2 + 1)
      )
      mesh.add(sWin)
    }
  }
}

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

    // ── Isometric Camera ──
    this.camera.position.set(160, 100, 200)
    this.camera.lookAt(0, -10, 0)

    // Soft studio lighting
    s.add(new THREE.AmbientLight(0xffffff, 0.7))

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.1)
    dirLight.position.set(60, 140, 100)
    s.add(dirLight)

    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 0.4)
    fillLight.position.set(-80, 50, -80)
    s.add(fillLight)

    // ── Heat point light — small range so it only lights the canyon gap ──
    this.heatLight = new THREE.PointLight(0xf97316, 0, 80)
    this.heatLight.position.set(0, -50, 0)
    s.add(this.heatLight)

    // ── Base pad ──
    const padGeo = new THREE.BoxGeometry(280, 5, 140)
    const padMat = new THREE.MeshStandardMaterial({ color: 0xe8edf2, roughness: 0.7, metalness: 0.05 })
    this.basePad = new THREE.Mesh(padGeo, padMat)
    this.basePad.position.set(0, -123, 0)
    s.add(this.basePad)

    // ── Buildings ──
    const BW = 58, BH = 200, BD = 52
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x2e3f52,
      roughness: 0.25,
      metalness: 0.3
    })

    // Store building materials for heat coloring
    this.leftMat  = bMat.clone()
    this.rightMat = bMat.clone()
    // Give materials emissive support
    this.leftMat.emissive  = new THREE.Color(0, 0, 0)
    this.rightMat.emissive = new THREE.Color(0, 0, 0)

    this.leftBldg = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), this.leftMat)
    this.leftBldg.position.set(-62, -20, 0)
    this.leftBldg.rotation.y = 0.15
    s.add(this.leftBldg)

    this.rightBldg = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BD), this.rightMat)
    this.rightBldg.position.set(62, -20, 0)
    this.rightBldg.rotation.y = -0.15
    s.add(this.rightBldg)

    // Add windows & doors
    addWindowsAndDoors(this.leftBldg,  BW, BH, BD, s)
    addWindowsAndDoors(this.rightBldg, BW, BH, BD, s)

    // ── Canyon heat-blush planes (inner faces of buildings) ──
    // These are additive planes on each building's inner wall — glow orange when close
    const blushMat = () => new THREE.MeshBasicMaterial({
      color: 0xff5500, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
    const blushGeo = new THREE.PlaneGeometry(BD, BH * 0.85)

    this.leftHeatWall = new THREE.Mesh(blushGeo, blushMat())
    // Position on the right face of left building (the inner canyon face)
    this.leftHeatWall.position.set(BW / 2 - 1, 0, 0)
    this.leftHeatWall.rotation.y = Math.PI / 2
    this.leftBldg.add(this.leftHeatWall)

    this.rightHeatWall = new THREE.Mesh(blushGeo, blushMat())
    this.rightHeatWall.position.set(-BW / 2 + 1, 0, 0)
    this.rightHeatWall.rotation.y = -Math.PI / 2
    this.rightBldg.add(this.rightHeatWall)

    // ── Multi-layer radiant glow in canyon — small, tight, between buildings ──
    const glow1Mat = new THREE.MeshBasicMaterial({
      color: 0xff4400, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    this.glowSphere1 = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), glow1Mat)
    this.glowSphere1.position.set(0, -55, 0)
    s.add(this.glowSphere1)

    // Inner core — even tighter
    const glow2Mat = new THREE.MeshBasicMaterial({
      color: 0xffaa40, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
    this.glowSphere2 = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), glow2Mat)
    this.glowSphere2.position.set(0, -55, 0)
    s.add(this.glowSphere2)

    // ── Inversion ceiling plane ──
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xF97316, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    })
    this.inversionPlane = new THREE.Mesh(new THREE.PlaneGeometry(80, 130), planeMat)
    this.inversionPlane.rotation.x = Math.PI / 2
    this.inversionPlane.position.set(0, 0, 0)
    s.add(this.inversionPlane)

    // ── Particles: Free Air (Cyan) ──
    const FREE_COUNT = 300
    this.freePos = new Float32Array(FREE_COUNT * 3)
    for (let i = 0; i < FREE_COUNT; i++) {
      let x = (Math.random() * 85) + 35
      if (Math.random() > 0.5) x *= -1
      this.freePos[i*3]   = x
      this.freePos[i*3+1] = (Math.random() - 0.5) * this.SCENE_H * 2
      this.freePos[i*3+2] = (Math.random() - 0.5) * 60
    }
    this.freeGeo = new THREE.BufferGeometry()
    this.freeGeo.setAttribute('position', new THREE.BufferAttribute(this.freePos, 3))
    this.freePoints = new THREE.Points(this.freeGeo, new THREE.PointsMaterial({
      color: 0x38BDF8, size: 2.5, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    s.add(this.freePoints)

    // ── Particles: Trapped Heat (Orange) ──
    const TRAPPED_COUNT = 320
    this.trappedPos = new Float32Array(TRAPPED_COUNT * 3)
    this.trappedVel = []
    for (let i = 0; i < TRAPPED_COUNT; i++) {
      this.trappedPos[i*3]   = (Math.random() - 0.5) * 50
      this.trappedPos[i*3+1] = -60 + Math.random() * 30
      this.trappedPos[i*3+2] = (Math.random() - 0.5) * 30
      this.trappedVel.push({
        dx: (Math.random() - 0.5) * 0.4,
        dy: 0.3 + Math.random() * 0.5
      })
    }
    this.trappedGeo = new THREE.BufferGeometry()
    this.trappedGeo.setAttribute('position', new THREE.BufferAttribute(this.trappedPos, 3))

    // Two-tone: hot core (yellow) + outer (orange) – use two overlapping point clouds
    this.trappedPoints = new THREE.Points(this.trappedGeo, new THREE.PointsMaterial({
      color: 0xff6600, size: 7.0, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    s.add(this.trappedPoints)

    // Inner core particles (smaller, brighter)
    const CORE_COUNT = 80
    this.corePos = new Float32Array(CORE_COUNT * 3)
    for (let i = 0; i < CORE_COUNT; i++) {
      this.corePos[i*3]   = (Math.random() - 0.5) * 20
      this.corePos[i*3+1] = -60 + Math.random() * 20
      this.corePos[i*3+2] = (Math.random() - 0.5) * 15
    }
    this.coreGeo = new THREE.BufferGeometry()
    this.coreGeo.setAttribute('position', new THREE.BufferAttribute(this.corePos, 3))
    this.corePoints = new THREE.Points(this.coreGeo, new THREE.PointsMaterial({
      color: 0xffee88, size: 9.0, transparent: true, opacity: 1.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    }))
    s.add(this.corePoints)
  }

  update(progress) {
    this._progress = progress
    // Slow isometric pan
    this.camera.position.x = THREE.MathUtils.lerp(140, 180, progress)
    this.camera.position.y = THREE.MathUtils.lerp(85, 110, progress)
    this.camera.lookAt(0, -10, 0)
  }

  onFrame() {
    const gap = this._gap

    // Building spread
    const bCloseX = 35
    const bFarX = 72
    const targetX = THREE.MathUtils.lerp(bCloseX, bFarX, gap)
    this.leftBldg.position.x  = -targetX
    this.rightBldg.position.x =  targetX

    // Inversion ceiling
    const ceilY = THREE.MathUtils.lerp(50, -20, this._progress) + (gap * 80)
    this.inversionPlane.position.y = ceilY
    // baseOpacity: mostly driven by gap (close = hot), not scroll progress alone
    // This ensures heat is always visible when buildings are close
    const baseOpacity = Math.max(1 - gap, smoothstep(this._progress, 0.1, 0.9) * (1 - gap * 0.5))
    this.inversionPlane.material.opacity = baseOpacity * 0.4 * (1 - gap)

    // ── Radiant heat glow — tight, in the canyon floor only ──
    const glowStr = Math.max(0, 1 - gap)  // full glow when close, 0 when far
    this.glowSphere1.material.opacity = glowStr * 0.5
    this.glowSphere2.material.opacity = glowStr * 0.85
    this.heatLight.intensity           = glowStr * 2.0  // low enough not to wash buildings
    // Stay at canyon floor between buildings, never rise above mid-building
    const glowY = THREE.MathUtils.lerp(-55, -20, this._progress * (1 - gap))
    this.glowSphere1.position.set(0, glowY, 0)
    this.glowSphere2.position.set(0, glowY, 0)
    this.heatLight.position.set(0, glowY + 10, 0)

    // ── Inner wall heat-blush — canyon faces turn orange-red when close ──
    const heatWallOpacity = glowStr * 0.55  // strong orange when buildings close
    this.leftHeatWall.material.opacity  = heatWallOpacity
    this.rightHeatWall.material.opacity = heatWallOpacity

    // ── Subtle emissive tint on buildings (only a hint, not full burn) ──
    const emStr = glowStr * 0.08
    this.leftMat.emissive.setRGB(emStr, emStr * 0.3, 0)
    this.rightMat.emissive.setRGB(emStr, emStr * 0.3, 0)

    // Drive particle opacity to 0 when fully open
    const particleAlpha = Math.max(0, 1 - gap)
    this.trappedPoints.material.opacity = 0.95 * particleAlpha
    this.corePoints.material.opacity    = 1.0  * particleAlpha

    // ── Free air particles ──
    for (let i = 0; i < this.freePos.length / 3; i++) {
      let x = this.freePos[i*3]
      let y = this.freePos[i*3+1] + 1.2 + gap * 0.5
      if (y > this.SCENE_H) {
        y = -this.SCENE_H
        if (gap > 0.5 && Math.random() > 0.5) {
          x = (Math.random() - 0.5) * targetX * 1.5
        } else {
          x = (Math.random() * 85) + targetX + 10
          if (Math.random() > 0.5) x *= -1
        }
      }
      this.freePos[i*3]   = x
      this.freePos[i*3+1] = y
    }
    this.freeGeo.attributes.position.needsUpdate = true

    // ── Trapped heat particles ──
    for (let i = 0; i < this.trappedPos.length / 3; i++) {
      let x = this.trappedPos[i*3]
      let y = this.trappedPos[i*3+1]
      const vel = this.trappedVel[i]

      x += vel.dx
      y += vel.dy

      const wallLimit = targetX - 8
      if (x < -wallLimit || x > wallLimit) {
        vel.dx *= -1
        x = Math.max(-wallLimit, Math.min(wallLimit, x))
      }

      if (gap > 0.55) {
        // Buildings far apart — heat escapes freely, flies up and disappears
        vel.dy = Math.min(vel.dy + 0.04, 2.5 + gap * 2)
        if (y > this.SCENE_H + 40) {
          // Reset far below — will have zero opacity so invisible anyway
          y = -65
          vel.dy = 0.4 + Math.random() * 0.4
          x = (Math.random() - 0.5) * targetX * 1.5
        }
      } else if (y > ceilY) {
        // Trapped — bounce off ceiling and swirl
        y = ceilY - Math.random() * 5
        vel.dy = -0.1 - Math.random() * 0.2
        vel.dx += (Math.random() - 0.5) * 0.5
      } else if (y < -65) {
        y = -65
        vel.dy = 0.3 + Math.random() * 0.5
      } else {
        vel.dy += 0.012 + gap * 0.02
        if (vel.dy > 1.0 + gap) vel.dy = 1.0 + gap
      }
      vel.dx *= 0.99

      this.trappedPos[i*3]   = x
      this.trappedPos[i*3+1] = y
    }
    this.trappedGeo.attributes.position.needsUpdate = true

    // ── Inner core particles follow heat centroid ──
    const heatCentreY = this.glowSphere1.position.y
    for (let i = 0; i < this.corePos.length / 3; i++) {
      this.corePos[i*3]   += (Math.random() - 0.5) * 0.5
      this.corePos[i*3+1] += 0.6
      if (this.corePos[i*3+1] > heatCentreY + 12) {
        this.corePos[i*3+1] = heatCentreY - 12
        this.corePos[i*3]   = (Math.random() - 0.5) * 20
      }
    }
    this.coreGeo.attributes.position.needsUpdate = true
  }
}
