import type { Task } from "./types/types.ts";
import {v4 as uuidv4} from 'uuid';

let tasks: Task[] = [];

function initTasks() {
  const titles = [
    "позвонить маме",
    "купить картридж",
    "отнести шторы в химчистку",
    "постирать покрывало",
    "заказать шампунь"
  ]
  tasks = titles.map(title => ({
    id: uuidv4(),
    title,
    completed: false
  }))
}

function addTask(title: string): Task {
  const addingTask: Task = { 
    id: uuidv4(),
    title: title, 
    completed: false
    }

  tasks.push(addingTask)
  return addingTask
}  

// function deleteTask(index: number) {
//   if (index >= 0 && index < tasks.length) {
//     const deleted = tasks.splice(index, 1)
//     return deleted[0];
//   }
//   return null
// }

function deleteTaskById(id: string): boolean {
  const index = tasks.findIndex(task => task.id === id)
  if (index === -1) {
    return false
  }
  tasks.splice(index, 1)
  return true
}

function updateTask (id: string, updates: Partial<Task>): Task | null {
  const task = tasks.find(task => task.id === id)
  if(!task) {
    return null
  }

  if (updates.title !== undefined) {
    const trimmed = String(updates.title).trim()
    if (trimmed) {
      task.title = trimmed
    }
  }

  if (updates.completed !== undefined) {
    task.completed = Boolean(updates.completed)
  }

  return task
}


export { tasks, initTasks, addTask, deleteTaskById, updateTask }