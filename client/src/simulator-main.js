import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'leaflet/dist/leaflet.css'
import './style.css'
import './simulator.css'

import { initSolution }   from './sections/solution.js'
import { initSimulation } from './sections/simulation.js'

gsap.registerPlugin(ScrollTrigger)
ScrollTrigger.config({ ignoreMobileResize: true })

document.addEventListener('DOMContentLoaded', () => {
  initSolution()
  initSimulation()
  ScrollTrigger.refresh()
})
