const request = require('supertest')
const express = require('express')

const app = express()
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DevTrack API is running' })
})

describe('Health Check', () => {
  test('GET /api/health returns 200', async () => {
    const response = await request(app)
      .get('/api/health')
    
    expect(response.status).toBe(200)
    expect(response.body.status).toBe('ok')
  })
})