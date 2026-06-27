const express = require('express')
const Notification = require('../models/Notification')
const { protect } = require('../middleware/auth')

const router = express.Router()

// GET /api/notifications — get all notifications for logged in user
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user._id
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'name avatar')

    res.json(notifications)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/notifications/unread-count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false
    })
    res.json({ count })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true })
    res.json({ message: 'Marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    )
    res.json({ message: 'All marked as read' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router