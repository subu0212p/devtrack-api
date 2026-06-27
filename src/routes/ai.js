const express = require('express')
const { protect } = require('../middleware/auth')
const { suggestTasks, improveTaskDescription, planSprint } = require('../config/ai')
const Task = require('../models/Task')

const router = express.Router()

// POST /api/ai/suggest-tasks
router.post('/suggest-tasks', protect, async (req, res) => {
  try {
    const { projectName, projectDescription } = req.body

    if (!projectName) {
      return res.status(400).json({ message: 'Project name is required' })
    }

    const suggestions = await suggestTasks(projectName, projectDescription)
    res.json({ suggestions })
  } catch (error) {
    res.status(500).json({ message: 'AI service error: ' + error.message })
  }
})

// POST /api/ai/improve-description
router.post('/improve-description', protect, async (req, res) => {
  try {
    const { title, description } = req.body

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' })
    }

    const result = await improveTaskDescription(title, description)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'AI service error: ' + error.message })
  }
})

// POST /api/ai/plan-sprint
router.post('/plan-sprint', protect, async (req, res) => {
  try {
    const { projectId, deadline } = req.body

    if (!projectId || !deadline) {
      return res.status(400).json({ message: 'Project ID and deadline required' })
    }

    const tasks = await Task.find({
      project: projectId,
      status: { $ne: 'done' }
    })

    if (tasks.length === 0) {
      return res.status(400).json({ message: 'No pending tasks found' })
    }

    const result = await planSprint(tasks, deadline)
    res.json(result)
  } catch (error) {
    res.status(500).json({ message: 'AI service error: ' + error.message })
  }
})

module.exports = router