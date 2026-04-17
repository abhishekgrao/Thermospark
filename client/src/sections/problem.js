import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createCityGrid } from '../visuals/cityGrid.js'

export function initProblem() {
  const scene = document.getElementById('city-scene')
  if (scene) createCityGrid(scene)

  // Text reveals on scroll enter
  ScrollTrigger.create({
    trigger: '#s2',
    start: 'top 75%',
    onEnter: () => {
      gsap.from('.reveal-h2', { autoAlpha: 0, y: 35, duration: 0.85, ease: 'power3.out' })
      gsap.from('.section-label', { autoAlpha: 0, x: -20, duration: 0.6, ease: 'power2.out' })
      gsap.from('.fact-line', {
        autoAlpha: 0,
        x: -30,
        stagger: 0.22,
        duration: 0.75,
        ease: 'power2.out',
        delay: 0.3,
      })
    },
  })

  // Building glow intensifies with scroll progress
  ScrollTrigger.create({
    trigger: '#s2',
    start: 'top 60%',
    end: 'bottom 40%',
    scrub: 1.2,
    onUpdate(self) {
      const glow = self.progress
      document.querySelectorAll('#city-scene .building-svg').forEach(b => {
        const r = Math.round(30 + glow * 200)
        const g2 = Math.round(41 + glow * 60)
        const bl = Math.round(59 - glow * 30)
        b.setAttribute('fill', `rgb(${r},${g2},${bl})`)
      })
      const overlay = document.querySelector('#city-scene .heat-overlay')
      if (overlay) overlay.setAttribute('opacity', (0.5 + glow * 0.5).toFixed(2))
    },
  })
}
