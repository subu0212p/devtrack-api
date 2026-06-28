const express = require('express')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const User = require('../models/User')
const { protect } = require('../middleware/auth')
const { sendVerificationEmail, sendPasswordResetEmail } = require('../config/email')

const router = express.Router()

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      verificationExpiry,
      isVerified: false
    })

    await sendVerificationEmail(email, name, verificationToken)

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.'
    })
  } catch (error) {
    console.error('REGISTER ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body

    const user = await User.findOne({
      verificationToken: token,
      verificationExpiry: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' })
    }

    user.isVerified = true
    user.verificationToken = null
    user.verificationExpiry = null
    await user.save()

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' })
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findOne({ email })

    if (!user) {
      return res.status(404).json({ message: 'No account with that email' })
    }

    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = resetToken
    user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000)
    await user.save()

    await sendPasswordResetEmail(email, user.name, resetToken)

    res.json({ message: 'Password reset email sent' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' })
    }

    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpiry = null
    await user.save()

    res.json({ message: 'Password reset successful' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { name, email, avatar, googleId } = req.body

    let user = await User.findOne({ email })

    if (!user) {
      user = await User.create({
        name,
        email,
        avatar,
        authProvider: 'google',
        isVerified: true
      })
    } else {
      user.avatar = avatar
      user.isVerified = true
      await user.save()
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// POST /api/auth/github
// POST /api/auth/github
router.post('/github', async (req, res) => {
  try {
    const { code, name, email, avatar, githubId } = req.body

    // if code is provided, exchange it for user info
    if (code) {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code
        })
      })
      const tokenData = await tokenRes.json()

      if (tokenData.error) {
        return res.status(400).json({ message: 'GitHub OAuth failed' })
      }

      const userRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })
      const githubUser = await userRes.json()

      const emailRes = await fetch('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })
      const emails = await emailRes.json()
      const primaryEmail = emails.find(e => e.primary)?.email || githubUser.email

      let user = await User.findOne({ email: primaryEmail })

      if (!user) {
        user = await User.create({
          name: githubUser.name || githubUser.login,
          email: primaryEmail,
          avatar: githubUser.avatar_url,
          authProvider: 'github',
          isVerified: true
        })
      } else {
        user.avatar = githubUser.avatar_url
        user.isVerified = true
        await user.save()
      }

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user._id)
      })
    }

    // fallback: direct user info provided
    let user = await User.findOne({ email })
    if (!user) {
      user = await User.create({
        name, email, avatar,
        authProvider: 'github',
        isVerified: true
      })
    } else {
      user.avatar = avatar
      user.isVerified = true
      await user.save()
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      token: generateToken(user._id)
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router