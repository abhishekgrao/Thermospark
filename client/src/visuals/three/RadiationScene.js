/**
 * RadiationScene — Three.js scene for Section 3 (Radiation)
 *
 * Scroll journey:
 *  0.0 → 0.3  Wide aerial city shot, sun visible top-right
 *  0.1 → 0.5  Sun rays draw from sun → building rooftops
 *  0.4 → 0.8  Camera dolly-zooms toward the tallest building
 *  0.6 → 1.0  Buildings heat up (emissive orange glow)
 */
import * as THREE from 'three'
import { BaseScene, smoothstep } from './BaseScene.js'

// ── Building definitions (normalized 0–1) ──
const BUILDINGS = [
  { xN: 0.08, wN: 0.07, hN: 0.52 },
  { xN: 0.18, wN: 0.09, hN: 0.74 },
  { xN: 0.30, wN: 0.06, hN: 0.46 },
  { xN: 0.39, wN: 0.11, hN: 0.88 }, // tallest — camera zooms here
  { xN: 0.54, wN: 0.08, hN: 0.62 },
  { xN: 0.65, wN: 0.06, hN: 0.40 },
  { xN: 0.73, wN: 0.10, hN: 0.78 },
]

const SCENE_W  = 320   // world-space width
const SCENE_H  = 180   // world-space height
const BLDG_D   = 28    // building depth

// Camera positions
const CAM_START = new THREE.Vector3(0,  55, 280)
const CAM_END   = new THREE.Vector3(-10, 30,  70)
const CAM_TARGET_START = new THREE.Vector3(0, 20, 0)
const CAM_TARGET_END   = new THREE.Vector3(-10, 60, 0)

export class RadiationScene extends BaseScene {
  constructor(canvas) {
    super(canvas)

    this._progress = 0
    this._rayMats  = []
    this._buildings = []

    this._buildScene()
  }

  _buildScene() {
    const s = this.scene

    // ── Fog ──
    s.fog = new THREE.Fog(0x020617, 200, 600)

    // ── Lights ──
    s.add(new THREE.AmbientLight(0x1a2748, 0.9))

    const sunDir = new THREE.DirectionalLight(0xffffff, 0)
    sunDir.position.set(140, 160, 80)
    s.add(sunDir)
    this._sunLight = sunDir

    // ── Ground plane ──
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(SCENE_W * 2, SCENE_W * 2),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 1 })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    s.add(ground)

    // ── Buildings ──
    const bMat = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      roughness: 0.88,
      metalness: 0.08,
      emissive: new THREE.Color(0, 0, 0),
      emissiveIntensity: 0,
    })

    const sunPos = new THREE.Vector3(140, 160, 20)
    const rayPoints = []

    BUILDINGS.forEach((b, i) => {
      const bx  = (b.xN - 0.5) * SCENE_W
      const bw  = b.wN * SCENE_W
      const bh  = b.hN * SCENE_H
      const roofY = bh

      // Main body
      const geo  = new THREE.BoxGeometry(bw, bh, BLDG_D)
      const mat  = bMat.clone()
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(bx + bw / 2, bh / 2, 0)
      s.add(mesh)
      this._buildings.push(mesh)

      // Window rows (small emissive planes)
      const winMat = new THREE.MeshBasicMaterial({
        color: 0xfcd34d, transparent: true, opacity: 0.28,
      })
      const floors = Math.floor(bh / 10)
      for (let f = 0; f < floors; f++) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(bw * 0.65, 3.5),
          winMat.clone()
        )
        win.position.set(bx + bw / 2, 6 + f * 10, BLDG_D / 2 + 0.2)
        s.add(win)
      }

      // Roof glow bar
      const roofGlow = new THREE.Mesh(
        new THREE.BoxGeometry(bw, 1.5, BLDG_D + 2),
        new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0 })
      )
      roofGlow.position.set(bx + bw / 2, roofY + 0.75, 0)
      s.add(roofGlow)
      this._buildings.push(roofGlow)   // also heated

      // Ray: sun → rooftop centre
      const rooftopPos = new THREE.Vector3(bx + bw / 2, roofY, 5)
      rayPoints.push({ from: sunPos.clone(), to: rooftopPos })
    })

    // ── Sun rays (3D Cylinders, one per building) ──
    rayPoints.forEach(({ from, to }) => {
      const distance = from.distanceTo(to)
      const geo = new THREE.CylinderGeometry(1.2, 1.2, distance, 8)
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffaa00, transparent: true, opacity: 0,
      })
      const cylinder = new THREE.Mesh(geo, mat)
      
      // Position at the midpoint
      cylinder.position.copy(from).lerp(to, 0.5)
      cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
      
      this.scene.add(cylinder)
      this._rayMats.push(mat)
    })

    // ── Sun sphere ──
    const sunGeo  = new THREE.SphereGeometry(12, 16, 16)
    const sunMat  = new THREE.MeshBasicMaterial({ color: 0xfcd34d })
    const sunMesh = new THREE.Mesh(sunGeo, sunMat)
    sunMesh.position.copy(sunPos)
    s.add(sunMesh)

    // Sun halo (additive blended disc)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfcd34d, transparent: true, opacity: 0.18,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    })
    const halo = new THREE.Mesh(new THREE.CircleGeometry(40, 32), haloMat)
    halo.position.copy(sunPos)
    halo.lookAt(this.camera.position)
    s.add(halo)
    this._sunHalo = halo

    // ── Star field backdrop ──
    const starCount = 300
    const starPos   = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3]     = (Math.random() - 0.5) * 800
      starPos[i * 3 + 1] = 50 + Math.random() * 400
      starPos[i * 3 + 2] = -200 - Math.random() * 300
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    const stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.45 })
    )
    s.add(stars)

    // Initial camera
    this.camera.position.copy(CAM_START)
    this.camera.lookAt(CAM_TARGET_START)
  }

  update(progress) {
    this._progress = progress

    // ── Camera dolly ──
    const camT = smoothstep(progress, 0.35, 0.95)
    this.camera.position.lerpVectors(CAM_START, CAM_END, camT)
    const target = new THREE.Vector3().lerpVectors(CAM_TARGET_START, CAM_TARGET_END, camT)
    this.camera.lookAt(target)

    // ── Sun rays fade in ──
    const rayT = smoothstep(progress, 0.08, 0.5)
    for (const mat of this._rayMats) mat.opacity = rayT * 0.75

    // ── Sun light intensity ──
    this._sunLight.intensity = smoothstep(progress, 0.1, 0.7) * 2.2

    // ── Building heat (emissive) ──
    const heatT = smoothstep(progress, 0.45, 1.0)
    for (const mesh of this._buildings) {
      if (mesh.material.emissive) {
        mesh.material.emissive.setHSL(0.07, 1.0, heatT * 0.38)
        mesh.material.emissiveIntensity = heatT
        
        const coolColor = new THREE.Color(0x60A5FA); // stronger light blue
        const hotColor = new THREE.Color(0xf25c05);  // orangish red
        mesh.material.color.lerpColors(coolColor, hotColor, heatT);
      } else if (mesh.material.opacity !== undefined) {
        // roof glow bars
        mesh.material.opacity = heatT * 0.85
      }
    }

    // ── Sun halo pulses ──
    if (this._sunHalo) {
      this._sunHalo.material.opacity = 0.12 + smoothstep(progress, 0.1, 0.6) * 0.3
    }
  }

  onFrame() {
    // Slow halo billboard update
    if (this._sunHalo) this._sunHalo.lookAt(this.camera.position)
  }
}
