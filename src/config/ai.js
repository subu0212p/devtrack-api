const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

const suggestTasks = async (projectName, projectDescription) => {
  const prompt = `
    You are a project management assistant.
    Generate exactly 8 practical task suggestions for a project called "${projectName}".
    Project description: "${projectDescription || 'No description provided'}"
    
    Respond with ONLY a JSON array, no other text:
    [
      { "title": "task title", "description": "brief description", "priority": "medium" },
      ...
    ]
    
    Priority must be one of: low, medium, high, urgent
  `

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

const improveTaskDescription = async (title, description) => {
  const prompt = `
    You are a project management assistant.
    Improve this task description to be clear and professional.
    Task title: "${title}"
    Current description: "${description || 'No description yet'}"
    
    Respond with ONLY a JSON object, no other text:
    { "description": "improved description here" }
  `

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

const planSprint = async (tasks, deadline) => {
  const taskList = tasks.map(t =>
    `- ${t.title} (priority: ${t.priority}, due: ${t.dueDate || 'no due date'})`
  ).join('\n')

  const prompt = `
    You are a sprint planning assistant.
    Given these tasks and a deadline of ${deadline}, suggest which tasks to include in this sprint.
    
    Tasks:
    ${taskList}
    
    Respond with ONLY a JSON object, no other text:
    {
      "sprintTasks": ["task title 1", "task title 2"],
      "reasoning": "brief explanation"
    }
  `

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

module.exports = { suggestTasks, improveTaskDescription, planSprint }