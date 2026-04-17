import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import 'leaflet/dist/leaflet.css'
import './style.css'

import { initHero }       from './sections/hero.js'
import { initProblem }    from './sections/problem.js'
import { initRadiation }  from './sections/radiation.js'
import { initConduction } from './sections/conduction.js'
import { initConvection } from './sections/convection.js'
import { initGap }        from './sections/gap.js'
import { initSolution }   from './sections/solution.js'
import { initSimulation } from './sections/simulation.js'
import { initImpact }     from './sections/impact.js'

gsap.registerPlugin(ScrollTrigger)

ScrollTrigger.config({ ignoreMobileResize: true })

document.addEventListener('DOMContentLoaded', () => {
  initHero()
  initProblem()
  initRadiation()
  initConduction()
  initConvection()
  initGap()
  initSolution()
  initSimulation()
  initImpact()

  ScrollTrigger.refresh()
})
