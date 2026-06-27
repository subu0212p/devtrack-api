const express = require('express')
const Task = require('../models/Task')
const Project = require('../models/Project')
const { protect } = require('../middleware/auth')

const router = express.Router()

router.get('/:projectId/tasks', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/:projectId/tasks', protect, async (req, res) => {
  try {
    const { title, description } = req.body
    const project = await Project.findById(req.params.projectId)
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }
    const task = await Task.create({
      title,
      description,
      project: req.params.projectId,
      assignedTo: req.user._id
    })
    res.status(201).json(task)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.put('/:id/status', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }
    task.status = req.body.status
    await task.save()
    res.json(task)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router