import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initBridge() {
  ScrollTrigger.create({
    trigger: '#s-cta',
    start: 'top 70%',
    onEnter: () => {
      gsap.from('.bridge-badge', {
        autoAlpha: 0, y: 20, duration: 0.7, ease: 'power3.out',
      })
      gsap.from('.bridge-title', {
        autoAlpha: 0, y: 40, duration: 0.9, ease: 'power3.out', delay: 0.15,
      })
      gsap.from('.bridge-sub', {
        autoAlpha: 0, y: 24, duration: 0.75, ease: 'power2.out', delay: 0.3,
      })
      gsap.from('.bridge-cta-btn', {
        autoAlpha: 0, scale: 0.88, duration: 0.65, ease: 'back.out(1.6)', delay: 0.5,
      })
      gsap.from('.pill', {
        autoAlpha: 0, y: 16, stagger: 0.1, duration: 0.55, ease: 'power2.out', delay: 0.7,
      })
    },
  })

  // Pulsing glow parallax
  ScrollTrigger.create({
    trigger: '#s-cta',
    start: 'top bottom',
    end: 'bottom top',
    scrub: 1.5,
    onUpdate(self) {
      const p = self.progress
      gsap.set('.bridge-glow', {
        scale: 0.9 + p * 0.3,
        opacity: 0.5 + p * 0.4,
      })
    },
  })
}
