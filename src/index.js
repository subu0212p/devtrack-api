const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const connectDB = require('./config/database')
const { startCronJobs } = require('./config/cron')

dotenv.config()

connectDB()
startCronJobs()

const app = express()

app.use(cors({
  origin: 'http://localhost:3001',
  credentials: true
}))

app.use(express.json())

// Routes
app.use('/api/auth', require('./routes/auth'))
app.use('/api/projects', require('./routes/projects'))
app.use('/api/projects', require('./routes/tasks'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/notifications', require('./routes/notifications'))
app.use('/api/users', require('./routes/users'))
app.use('/api/ai', require('./routes/ai'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DevTrack API is running' })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = app