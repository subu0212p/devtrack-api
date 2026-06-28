const nodemailer = require('nodemailer')

const getTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  })
}

const sendVerificationEmail = async (email, name, token) => {
  const transporter = getTransporter()
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`

  await transporter.sendMail({
    from: `"DevTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your DevTrack account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #378ADD;">Welcome to DevTrack, ${name}!</h2>
        <p>Click the button below to verify your email address:</p>
        <a href="${verifyUrl}" style="background: #378ADD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email
        </a>
        <p style="color: #666; margin-top: 20px;">This link expires in 24 hours.</p>
        <p style="color: #666;">If you didn't create an account, ignore this email.</p>
      </div>
    `
  })
}

const sendPasswordResetEmail = async (email, name, token) => {
  const transporter = getTransporter()
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`

  await transporter.sendMail({
    from: `"DevTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset your DevTrack password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #378ADD;">Password Reset Request</h2>
        <p>Hi ${name}, click below to reset your password:</p>
        <a href="${resetUrl}" style="background: #E24B4A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
        <p style="color: #666; margin-top: 20px;">This link expires in 1 hour.</p>
        <p style="color: #666;">If you didn't request this, ignore this email.</p>
      </div>
    `
  })
}

const sendInviteEmail = async (email, inviterName, projectName, token) => {
  const transporter = getTransporter()
  const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${token}`

  await transporter.sendMail({
    from: `"DevTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${inviterName} invited you to ${projectName} on DevTrack`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #378ADD;">You've been invited!</h2>
        <p><b>${inviterName}</b> invited you to collaborate on <b>${projectName}</b>.</p>
        <a href="${inviteUrl}" style="background: #1D9E75; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Accept Invitation
        </a>
        <p style="color: #666; margin-top: 20px;">This invitation expires in 7 days.</p>
      </div>
    `
  })
}

const sendReminderEmail = async (email, name, tasks) => {
  const transporter = getTransporter()
  const taskList = tasks.map(t =>
    `<li><b>${t.title}</b> — due ${new Date(t.dueDate).toLocaleDateString()}</li>`
  ).join('')

  await transporter.sendMail({
    from: `"DevTrack" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `You have ${tasks.length} task(s) due soon — DevTrack`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #BA7517;">Task Reminder</h2>
        <p>Hi ${name}, the following tasks are due soon:</p>
        <ul>${taskList}</ul>
        <a href="${process.env.FRONTEND_URL}/dashboard" style="background: #378ADD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          View Tasks
        </a>
      </div>
    `
  })
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendInviteEmail,
  sendReminderEmail
}