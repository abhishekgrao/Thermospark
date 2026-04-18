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

// Camera positions for Isometric Premium feel
const CAM_START = new THREE.Vector3(200, 120, 260)
const CAM_END   = new THREE.Vector3(140,  90, 180)
const CAM_TARGET_START = new THREE.Vector3(0, 0, 0)
const CAM_TARGET_END   = new THREE.Vector3(0, 0, 0)

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

    // Fill light for soft shadows
    const fillLight = new THREE.DirectionalLight(0xa5b4fc, 0.5)
    fillLight.position.set(-100, 80, -100)
    s.add(fillLight)

    // ── Premium White Float Pad ──
    const padGeo = new THREE.BoxGeometry(260, 4, 180)
    const padMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 })
    const basePad = new THREE.Mesh(padGeo, padMat)
    basePad.position.set(0, -4, 0)
    s.add(basePad)

    // ── Grass layer ──
    const grassGeo = new THREE.BoxGeometry(245, 4.2, 165)
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x82c061, roughness: 1.0 })
    const grassPad = new THREE.Mesh(grassGeo, grassMat)
    grassPad.position.set(0, -4, 0)
    s.add(grassPad)

    // ── Buildings (Suburban Houses with Solar roofs) ──
    const houseColors = [0xffffff, 0xfdfbf7, 0xf5eedc, 0xfaf8f5, 0xeeddcc];
    
    
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x4f5b8c, // Solar blue roofs
      roughness: 0.2,
      metalness: 0.7,
      emissive: new THREE.Color(0, 0, 0),
      emissiveIntensity: 0,
    })
    roofMat.userData.originalColor = roofMat.color.clone();

    const sunPos = new THREE.Vector3(140, 160, 20)
    const rayPoints = []

    BUILDINGS.forEach((b, i) => {
      const bx  = (b.xN - 0.5) * SCENE_W * 0.8
      const bw  = b.wN * SCENE_W
      const bh  = Math.max(12, b.hN * SCENE_H * 0.3)
      const bD2 = Math.min(25, bw)
      const bZ  = (Math.random() - 0.5) * 80
      const roofY = bh - 2

      // Main house body
      const bColor = houseColors[Math.floor(Math.random() * houseColors.length)];
      const houseMat = new THREE.MeshStandardMaterial({
        color: bColor,
        roughness: 0.9,
        emissive: new THREE.Color(0, 0, 0),
        emissiveIntensity: 0,
      });
      houseMat.userData.originalColor = houseMat.color.clone();
      
      const geo  = new THREE.BoxGeometry(bw, bh, bD2)
      const mesh = new THREE.Mesh(geo, houseMat)
      mesh.position.set(bx + bw / 2, bh / 2 - 2, bZ)
      s.add(mesh)
      this._buildings.push(mesh)

      // Add simple door
      const doorGeo = new THREE.BoxGeometry(5, 8, 1);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 1.0 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, -bh/2 + 4, bD2/2);
      mesh.add(door);

      // Add simple windows
      const winGeo = new THREE.BoxGeometry(4, 4, 1);
      const winMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.2, metalness: 0.8 });
      const winL = new THREE.Mesh(winGeo, winMat);
      winL.position.set(-bw/4, 2, bD2/2);
      mesh.add(winL);
      const winR = new THREE.Mesh(winGeo, winMat);
      winR.position.set(bw/4, 2, bD2/2);
      mesh.add(winR);
      
      // Setup dynamic camera zoom targeting the tallest building
      if (i === 3) {
         // Camera zooms 0.5 units away from the front face!
         this._CAM_END = new THREE.Vector3(bx + bw/2, bh/2 - 2, bZ + bD2/2 + 2); 
         this._CAM_TARGET_END = new THREE.Vector3(bx + bw/2, bh/2 - 2, bZ);
      }

      // Solar roof
      const roofGeo = new THREE.BoxGeometry(bw + 2, 2.5, bD2 + 2)
      const rMat = roofMat.clone()
      rMat.userData.originalColor = roofMat.color.clone()
      
      const roof = new THREE.Mesh(roofGeo, rMat)
      roof.position.set(bx + bw / 2, roofY, bZ)
      s.add(roof)
      this._buildings.push(roof)

      // Ray: sun → rooftop centre
      const rooftopPos = new THREE.Vector3(bx + bw / 2, roofY, bZ)
      rayPoints.push({ from: sunPos.clone(), to: rooftopPos })
    })

    // Random trees scattered on grass
    const treeGeo = new THREE.SphereGeometry(4, 12, 12)
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 1 })
    for (let t = 0; t < 25; t++) {
        const tree = new THREE.Mesh(treeGeo, treeMat)
        tree.position.set((Math.random() - 0.5) * 220, 2, (Math.random() - 0.5) * 140)
        s.add(tree)
    }

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
    // Zoom straight into the wall by the end to transition to ConductionScene
    const camT = smoothstep(progress, 0.35, 1.0)
    const endPos = this._CAM_END || CAM_END
    const endTarget = this._CAM_TARGET_END || CAM_TARGET_END
    
    this.camera.position.lerpVectors(CAM_START, endPos, camT)
    const target = new THREE.Vector3().lerpVectors(CAM_TARGET_START, endTarget, camT)
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
        const orig = mesh.material.userData.originalColor;
        const hotColor = new THREE.Color(0xf25c05);
        mesh.material.color.lerpColors(orig, hotColor, heatT * 0.85);
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
