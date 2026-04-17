import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initGap() {
  // Widget fades in first
  ScrollTrigger.create({
    trigger: '#s6',
    start: 'top 75%',
    onEnter: () => {
      gsap.from('#gap-widget', {
        autoAlpha: 0, scale: 0.9, duration: 0.9, ease: 'power3.out',
      })
      gsap.from('.gap-line', {
        autoAlpha: 0, y: 20, stagger: 0.28, duration: 0.75, ease: 'power2.out', delay: 0.4,
      })
    },
  })

  // Dim the scene increasingly as user scrolls through
  ScrollTrigger.create({
    trigger: '#s6',
    start: 'top top',
    end: 'bottom bottom',
    scrub: 1,
    onUpdate(self) {
      gsap.set('#s6', { backgroundImage: `radial-gradient(ellipse at center, rgba(249,115,22,${(self.progress * 0.04).toFixed(3)}) 0%, #010306 70%)` })
    },
  })
}
