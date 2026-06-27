const express = require('express')
const dotenv = require('dotenv')
const connectDB = require('./config/database')

dotenv.config()

connectDB()

const app = express()

app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/projects', require('./routes/projects'))
app.use('/api/projects', require('./routes/tasks'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DevTrack API is running' })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app