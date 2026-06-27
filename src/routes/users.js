const express = require('express')
const User = require('../models/User')
const { protect } = require('../middleware/auth')

const router = express.Router()

// GET /api/users/search?q=email or username
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query

    if (!q || q.length < 2) {
      return res.status(400).json({ message: 'Search query too short' })
    }

    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { username: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ],
      _id: { $ne: req.user._id }
    })
      .select('name email username avatar')
      .limit(10)

    res.json(users)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// GET /api/users/me — get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -verificationToken -resetPasswordToken')
    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// PUT /api/users/me — update profile
router.put('/me', protect, async (req, res) => {
  try {
    const { name, username } = req.body

    if (username) {
      const exists = await User.findOne({
        username,
        _id: { $ne: req.user._id }
      })
      if (exists) {
        return res.status(400).json({ message: 'Username already taken' })
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, username },
      { new: true }
    ).select('-password -verificationToken -resetPasswordToken')

    res.json(user)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router