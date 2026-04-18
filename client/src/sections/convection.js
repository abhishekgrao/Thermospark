import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ConvectionScene } from '../visuals/three/ConvectionScene.js'

export function initConvection() {
  const canvas = document.getElementById('convection-canvas')
  if (!canvas) return

  let scene = null

  // Init Three.js lazily
  ScrollTrigger.create({
    trigger: '#s5',
    start: 'top 120%',
    once: true,
    onEnter: () => {
      scene = new ConvectionScene(canvas)
    }
  })

  // Activate label
  ScrollTrigger.create({
    trigger: '#s5',
    start: 'top 70%',
    onEnter: () => document.getElementById('label-convection')?.classList.add('active'),
  })

  // Physics text entrance
  gsap.from('#physics-text-5', {
    autoAlpha: 0, x: 60, duration: 0.9, ease: 'power3.out',
    scrollTrigger: { trigger: '#s5', start: 'top 70%' },
  })

// Update Three.js scene on scroll
  ScrollTrigger.create({
    trigger: '#s5',
    start: 'top 60%',
    end: 'bottom 30%',
    scrub: 1.5,
    onUpdate(self) {
      if (scene) scene.update(self.progress)
    },
  })

  // Hook up the slider
  const slider = document.getElementById('building-gap-slider')
  const gapValue = document.getElementById('gap-value')
  if (slider) {
    slider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value)
      if (val < 0.3) gapValue.innerText = 'Close'
      else if (val < 0.7) gapValue.innerText = 'Medium'
      else gapValue.innerText = 'Far'
      
      if (scene && scene.setGap) {
        scene.setGap(val)
      }
    })
  }
}
