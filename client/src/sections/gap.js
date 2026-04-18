import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initGap() {
  // Widget fades in first — use fromTo so end state is always visible
  ScrollTrigger.create({
    trigger: '#s6',
    start: 'top 75%',
    onEnter: () => {
      gsap.fromTo('#gap-widget',
        { autoAlpha: 0, scale: 0.9 },
        { autoAlpha: 1, scale: 1, duration: 0.9, ease: 'power3.out' }
      )
      gsap.fromTo('.gap-line',
        { autoAlpha: 0, y: 20 },
        { autoAlpha: 1, y: 0, stagger: 0.28, duration: 0.75, ease: 'power2.out', delay: 0.4 }
      )
    },
  })

  // Subtle radial glow intensifies as user scrolls through the gap section
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
