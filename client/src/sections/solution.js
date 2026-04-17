import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initPreviewMap } from '../visuals/map.js'

let previewMapInited = false

export function initSolution() {
  // Title + subtitle
  ScrollTrigger.create({
    trigger: '#s7',
    start: 'top 70%',
    onEnter: () => {
      gsap.from('.solution-title', { autoAlpha: 0, y: 40, duration: 0.9, ease: 'power3.out' })
      gsap.from('.solution-sub',   { autoAlpha: 0, y: 24, duration: 0.75, ease: 'power2.out', delay: 0.25 })

      // Slider items stagger in from right
      gsap.from(['#si-1', '#si-2', '#si-3', '#si-4'], {
        autoAlpha: 0,
        x: 60,
        stagger: 0.12,
        duration: 0.7,
        ease: 'power2.out',
        delay: 0.5,
      })

      // Init preview map once
      if (!previewMapInited) {
        previewMapInited = true
        setTimeout(() => {
          try { initPreviewMap('preview-map') } catch (e) { /* map already init */ }
        }, 300)
      }
    },
  })

  // Thumb wiggle animation to suggest interaction
  ScrollTrigger.create({
    trigger: '#s7',
    start: 'top 60%',
    onEnter: () => {
      gsap.to('.fake-thumb', {
        x: 15, duration: 0.4, ease: 'power1.inOut',
        yoyo: true, repeat: 3, delay: 1.2,
        stagger: 0.1,
      })
    },
  })
}
