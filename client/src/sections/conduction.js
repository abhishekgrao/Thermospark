import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ConductionScene } from '../visuals/three/ConductionScene.js'

export function initConduction() {
  const canvas = document.getElementById('conduction-canvas')
  if (!canvas) return

  let scene = null

  // Init Three.js lazily
  ScrollTrigger.create({
    trigger: '#s4',
    start: 'top 120%',
    once: true,
    onEnter: () => {
      scene = new ConductionScene(canvas)
    }
  })

  // Activate label underline
  ScrollTrigger.create({
    trigger: '#s4',
    start: 'top 70%',
    onEnter: () => document.getElementById('label-conduction')?.classList.add('active'),
  })

  // Physics text entrance
  gsap.from('#physics-text-4', {
    autoAlpha: 0, x: 60, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#s4', start: 'top 70%' },
  })

  // Scrubbed heat wave updating Three.js
  ScrollTrigger.create({
    trigger: '#s4',
    start: 'top 80%',
    end: 'bottom 20%',
    scrub: 2,
    onUpdate(self) {
      if (scene) scene.update(self.progress)
    },
  })
}
