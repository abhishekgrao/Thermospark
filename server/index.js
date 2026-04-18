const express = require('express')
const cors = require('cors')
require('dotenv').config()

const weatherRouter = require('./routes/weather')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.use('/api/weather', weatherRouter)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Urban Thermal API running 🌡️' })
})

// app.listen(PORT, () => {
//   console.log(`\n🌡️  Urban Thermal API → http://localhost:${PORT}\n`)
// })

module.exports = app;
