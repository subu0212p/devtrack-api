const express = require('express')
const crypto = require('crypto')
const Project = require('../models/Project')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')
const { sendInviteEmail } = require('../config/email')

const router = express.Router()

// GET /api/projects
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    }).populate('owner', 'name avatar email')
      .populate('members.user', 'name avatar email')

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

// POST /api/projects/:id/invite — invite a member
router.post('/:id/invite', protect, async (req, res) => {
  try {
    const { email } = req.body
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name')

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    if (project.owner._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Only owner can invite members' })
    }

    // check if already a member
    const invitedUser = await User.findOne({ email })
    if (invitedUser) {
      const alreadyMember = project.members.some(
        m => m.user.toString() === invitedUser._id.toString()
      )
      if (alreadyMember) {
        return res.status(400).json({ message: 'User is already a member' })
      }
    }

    // generate invite token
    const token = crypto.randomBytes(32).toString('hex')

    project.invites.push({
      email,
      token,
      status: 'pending'
    })
    await project.save()

    // send invite email
    await sendInviteEmail(
      email,
      req.user.name,
      project.name,
      token
    )

    // create notification if user exists
    if (invitedUser) {
      await Notification.create({
        recipient: invitedUser._id,
        sender: req.user._id,
        type: 'invite_received',
        message: `${req.user.name} invited you to join ${project.name}`,
        project: project._id,
        link: `/invite?token=${token}`
      })
    }

    res.json({ message: 'Invitation sent successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/projects/accept-invite
router.post('/accept-invite', protect, async (req, res) => {
  try {
    const { token } = req.body

    const project = await Project.findOne({
      'invites.token': token,
      'invites.status': 'pending'
    })

    if (!project) {
  return res.status(404).json({ message: 'Invalid or expired invite' })
}

// prevent owner from joining as member
if (project.owner.toString() === req.user._id.toString()) {
  return res.status(400).json({ message: 'You are already the owner of this project' })
}

// prevent duplicate member
const alreadyMember = project.members.some(
  m => m.user.toString() === req.user._id.toString()
)
if (alreadyMember) {
  return res.status(400).json({ message: 'You are already a member of this project' })
}

const invite = project.invites.find(i => i.token === token)
invite.status = 'accepted'

project.members.push({
  user: req.user._id,
  role: 'member'
})

    await project.save()

    // notify project owner
    await Notification.create({
      recipient: project.owner,
      sender: req.user._id,
      type: 'invite_accepted',
      message: `${req.user.name} accepted your invitation to ${project.name}`,
      project: project._id
    })

    res.json({ message: 'Successfully joined project', project })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// DELETE /api/projects/:id/members/:userId — remove a member
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)

    if (!project) {
      return res.status(404).json({ message: 'Project not found' })
    }

    const isOwner = project.owner.toString() === req.user._id.toString()
    const isSelf = req.params.userId === req.user._id.toString()

    if (!isOwner && !isSelf) {
      return res.status(401).json({ message: 'Not authorized' })
    }

    project.members = project.members.filter(
      m => m.user.toString() !== req.params.userId
    )

    await project.save()
    res.json({ message: 'Member removed' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router