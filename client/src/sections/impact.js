import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initImpact() {
  const canvas = document.getElementById('impact-particles')
  if (canvas) initParticles(canvas)

  // Stagger headline lines
  ScrollTrigger.create({
    trigger: '#s9',
    start: 'top 75%',
    onEnter: () => {
      gsap.to('.impact-line', {
        autoAlpha: 1, y: 0,
        stagger: 0.22, duration: 0.95, ease: 'power3.out',
      })
      gsap.to(['.stat-card', '.impact-cta'], {
        autoAlpha: 1, y: 0,
        stagger: 0.15, duration: 0.8, ease: 'power2.out',
        delay: 0.7,
      })
    },
  })
}

function initParticles(canvas) {
  const ctx = canvas.getContext('2d')
  let raf

  const PARTICLE_COUNT = 60
  let particles = []

  function resize() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    particles = createParticles()
  }

  function createParticles() {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 200,
      r: 1.2 + Math.random() * 2.5,
      speed: 0.3 + Math.random() * 0.6,
      dx: (Math.random() - 0.5) * 0.5,
      opacity: 0.2 + Math.random() * 0.6,
      color: Math.random() > 0.5 ? '#38BDF8' : '#22C55E',
    }))
  }

  function render() {
    const { width: W, height: H } = canvas
    ctx.clearRect(0, 0, W, H)

    for (const p of particles) {
      p.y -= p.speed
      p.x += p.dx

      if (p.y < -10) {
        p.y = H + 10
        p.x = Math.random() * W
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.opacity
      ctx.fill()
    }

    ctx.globalAlpha = 1
    raf = requestAnimationFrame(render)
  }

  window.addEventListener('resize', resize, { passive: true })
  resize()
  render()
}
