const express = require('express')
const axios = require('axios')
const router = express.Router()

const mockData = require('../data/mockData.json')

router.get('/', async (req, res) => {
  const city = req.query.city || 'Bangalore'
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!apiKey) {
    const key = findMockCity(city)
    return res.json({ ...mockData[key], source: 'mock' })
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
    const { data } = await axios.get(url)

    res.json({
      city: data.name,
      country: data.sys.country,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      lat: data.coord.lat,
      lon: data.coord.lon,
      source: 'live'
    })
  } catch (err) {
    const key = findMockCity(city)
    res.json({ ...mockData[key], source: 'mock_fallback', error: err.message })
  }
})

function findMockCity(city) {
  return (
    Object.keys(mockData).find(k =>
      k.toLowerCase().includes(city.toLowerCase())
    ) || 'Bangalore'
  )
}

module.exports = router
