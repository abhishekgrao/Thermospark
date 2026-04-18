import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { RadiationScene } from '../visuals/three/RadiationScene.js'

export function initRadiation() {
  const canvas = document.getElementById('radiation-canvas')
  if (!canvas) return

  let scene = null

  // Init Three.js lazily when section approaches
  ScrollTrigger.create({
    trigger: '#s3',
    start: 'top 120%',
    once: true,
    onEnter: () => {
      scene = new RadiationScene(canvas)
    }
  })

  // Activate label underline
  ScrollTrigger.create({
    trigger: '#s3',
    start: 'top 70%',
    onEnter: () => document.getElementById('label-radiation')?.classList.add('active'),
  })

  // Physics text entrance
  gsap.from('#physics-text-3', {
    autoAlpha: 0, x: 60, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#s3', start: 'top 70%' },
  })

  // Scroll-linked Three.js update
  ScrollTrigger.create({
    trigger: '#s3',
    start: 'top 80%',
    end: 'bottom 15%',
    scrub: 1.8,
    onUpdate(self) {
      if (scene) scene.update(self.progress)
    },
  })
}
