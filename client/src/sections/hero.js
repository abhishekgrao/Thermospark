import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { initHeatmapCanvas } from '../visuals/heatmap.js'

export function initHero() {
  const canvas = document.getElementById('hero-canvas')
  if (canvas) initHeatmapCanvas(canvas)

  // Entrance sequence
  const tl = gsap.timeline({ delay: 0.2, defaults: { ease: 'power3.out' } })

  tl.from('.hero-badge',           { autoAlpha: 0, y: 24, duration: 0.8 })
    .from('.hero-title .line',     { autoAlpha: 0, y: 50, stagger: 0.14, duration: 1.0 }, '-=0.5')
    .from('.hero-subtitle',        { autoAlpha: 0, y: 24, duration: 0.75 }, '-=0.4')
    .from('.hero-actions',         { autoAlpha: 0, y: 24, duration: 0.65 }, '-=0.35')
    .from('.scroll-indicator',     { autoAlpha: 0, duration: 0.5 }, '-=0.2')

  // Parallax fade on scroll
  gsap.to('.hero-content', {
    autoAlpha: 0,
    y: -80,
    ease: 'none',
    scrollTrigger: {
      trigger: '#s1',
      start: 'top top',
      end: '40% top',
      scrub: 1,
    },
  })
}
