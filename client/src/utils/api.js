const BASE_URL = '/api'

export async function fetchWeather(city = 'Bangalore') {
  try {
    const res = await fetch(`${BASE_URL}/weather?city=${encodeURIComponent(city)}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    console.warn('[API] fetchWeather failed, using fallback:', err.message)
    return {
      city: 'Bangalore',
      country: 'IN',
      temp: 32,
      feels_like: 36,
      humidity: 65,
      wind_speed: 3.2,
      lat: 12.9716,
      lon: 77.5946,
      source: 'client_fallback',
    }
  }
}
