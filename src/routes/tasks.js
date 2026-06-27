const express = require('express')
const Task = require('../models/Task')
const Project = require('../models/Project')
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')

const router = express.Router()

// GET /api/projects/:projectId/tasks
router.get('/:projectId/tasks', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.projectId })
      .populate('assignedTo', 'name avatar email')
      .populate('createdBy', 'name avatar')
      .populate('comments.user', 'name avatar')
      .sort({ createdAt: -1 })

    res.json(tasks)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/projects/:projectId/tasks
router.post('/:projectId/tasks', protect, async (req, res) => {
  try {
    const { title, description, priority, dueDate, labels, assignedTo } = req.body

    const project = await Project.findById(req.params.projectId)
    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || 'medium',
      dueDate: dueDate || null,
      labels: labels || [],
      project: req.params.projectId,
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    })

    // notify assigned user
    if (assignedTo && assignedTo !== req.user._id.toString()) {
      await Notification.create({
        recipient: assignedTo,
        sender: req.user._id,
        type: 'task_assigned',
        message: `${req.user.name} assigned you a task: "${title}"`,
        task: task._id,
        project: req.params.projectId
      })
    }

    const populated = await task.populate([
      { path: 'assignedTo', select: 'name avatar email' },
      { path: 'createdBy', select: 'name avatar' }
    ])

    res.status(201).json(populated)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/tasks/:id/status
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

// PUT /api/tasks/:id — update full task
router.put('/:id', protect, async (req, res) => {
  try {
    const { title, description, priority, dueDate, labels, assignedTo, status } = req.body

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { title, description, priority, dueDate, labels, assignedTo, status },
      { new: true }
    ).populate('assignedTo', 'name avatar email')
     .populate('createdBy', 'name avatar')

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    res.json(task)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/tasks/:id/comments — add comment
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ message: 'Comment text required' })
    }

    const task = await Task.findById(req.params.id)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    task.comments.push({
      user: req.user._id,
      text
    })

    await task.save()

    const populated = await task.populate('comments.user', 'name avatar')

    res.status(201).json(populated.comments[populated.comments.length - 1])
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/tasks/:id — delete task
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)

    if (!task) {
      return res.status(404).json({ message: 'Task not found' })
    }

    await task.deleteOne()
    res.json({ message: 'Task removed' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router