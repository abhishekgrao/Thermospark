/**
 * Urban Heat Island simulation engine.
 *
 * Formula:
 *   T_baseline = T_ambient + UHI_OFFSET
 *      (cities are typically 5°C hotter than their ambient due to infrastructure)
 *
 *   T_simulated = T_ambient + UHI_OFFSET
 *     + (density  * 0.08)    ← more buildings trap more heat
 *     - (greenery * 0.06)    ← trees cool via evapotranspiration
 *     - (airflow  * 0.04)    ← wind carries heat away
 *     - (reflectivity * 0.05) ← reflective surfaces radiate less
 *
 *   All slider values are 0–100, normalised internally to 0–1.
 */

const UHI_OFFSET = 5 // °C added by urbanisation baseline

export const DEFAULT_PARAMS = {
  greenery: 40,
  density: 60,
  airflow: 30,
  reflectivity: 25,
}

/**
 * @param {number} tAmbient - Base temperature from weather API (°C)
 * @param {object} params   - Slider values (0–100 each)
 * @returns {{ tBefore: number, tAfter: number, reduction: number, color: string }}
 */
export function calculateTemperature(tAmbient, params = DEFAULT_PARAMS) {
  const { greenery, density, airflow, reflectivity } = params

  const tBefore = Math.round((tAmbient + UHI_OFFSET) * 10) / 10

  const delta =
    (density / 100) * 8 -
    (greenery / 100) * 6 -
    (airflow / 100) * 4 -
    (reflectivity / 100) * 5

  const tAfter = Math.round((tAmbient + UHI_OFFSET + delta) * 10) / 10
  const reduction = Math.round((tBefore - tAfter) * 10) / 10

  return {
    tBefore,
    tAfter,
    reduction,
    color: getTemperatureColor(tAfter),
  }
}

export function getTemperatureColor(temp) {
  if (temp < 20) return '#38BDF8'
  if (temp < 26) return '#22C55E'
  if (temp < 32) return '#FCD34D'
  if (temp < 38) return '#F97316'
  return '#FB7185'
}

/**
 * Calculate zone contributions for the bar chart
 * @returns {{ before: number[], after: number[] }}
 */
export function getZoneData(tAmbient, params) {
  const { tBefore, tAfter } = calculateTemperature(tAmbient, params)
  const ratio = tAfter / tBefore

  return {
    labels: ['Urban Core', 'Commercial', 'Residential', 'Parks'],
    before: [tBefore + 2, tBefore, tBefore - 1.5, tBefore - 4],
    after: [
      Math.round((tBefore + 2) * ratio * 10) / 10,
      Math.round(tBefore * ratio * 10) / 10,
      Math.round((tBefore - 1.5) * ratio * 10) / 10,
      Math.round((tBefore - 4) * ratio * 10) / 10,
    ],
  }
}
