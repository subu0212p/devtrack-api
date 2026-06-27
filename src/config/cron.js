const cron = require('node-cron')
const Task = require('../models/Task')
const User = require('../models/User')
const Notification = require('../models/Notification')
const { sendReminderEmail } = require('./email')

const startCronJobs = () => {

  // runs every day at 9am — sends reminder for tasks due in 24 hours
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily reminder cron job...')
    try {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(23, 59, 59, 999)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const tasksDueSoon = await Task.find({
        dueDate: { $gte: today, $lte: tomorrow },
        status: { $ne: 'done' }
      }).populate('assignedTo', 'name email')

      // group tasks by user
      const tasksByUser = {}
      tasksDueSoon.forEach(task => {
        if (task.assignedTo) {
          const userId = task.assignedTo._id.toString()
          if (!tasksByUser[userId]) {
            tasksByUser[userId] = {
              user: task.assignedTo,
              tasks: []
            }
          }
          tasksByUser[userId].tasks.push(task)
        }
      })

      // send email to each user
      for (const userId in tasksByUser) {
        const { user, tasks } = tasksByUser[userId]
        await sendReminderEmail(user.email, user.name, tasks)

        // create in-app notification
        await Notification.create({
          recipient: user._id,
          type: 'task_due_soon',
          message: `You have ${tasks.length} task(s) due today or tomorrow`,
        })
      }

      console.log(`Reminders sent to ${Object.keys(tasksByUser).length} users`)
    } catch (error) {
      console.error('Cron job error:', error.message)
    }
  })

  // runs every hour — marks overdue tasks
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date()
      const overdueTasks = await Task.find({
        dueDate: { $lt: now },
        status: { $ne: 'done' }
      }).populate('assignedTo', 'name email')

      for (const task of overdueTasks) {
        if (task.assignedTo) {
          const exists = await Notification.findOne({
            recipient: task.assignedTo._id,
            task: task._id,
            type: 'task_overdue'
          })

          if (!exists) {
            await Notification.create({
              recipient: task.assignedTo._id,
              type: 'task_overdue',
              message: `Task "${task.title}" is overdue`,
              task: task._id
            })
          }
        }
      }
    } catch (error) {
      console.error('Overdue check error:', error.message)
    }
  })

  console.log('Cron jobs started')
}

module.exports = { startCronJobs }