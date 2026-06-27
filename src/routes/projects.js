const express = require('express')
const Project = require('../models/Project')
const { protect } = require('../middleware/auth')

const router = express.Router()

// GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user._id })
    res.json(projects)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/projects
router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body

    const project = await Project.create({
      name,
      description,
      owner: req.user._id
    })

    res.status(201).json(project)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    if (project.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    await project.deleteOne()
    res.json({ message: 'Project removed' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router