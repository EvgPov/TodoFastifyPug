import type { Task } from "../types/types.ts";
import {v4 as uuidv4} from 'uuid';

let tasks: Task[] = [];

function addTask(title: string, userId: string): Task {
    const newTask: Task = {
        id: uuidv4(),
        title: title.trim(),
        completed: false,
        userId,
    }
    tasks.push(newTask)
    return newTask
}

function getTasksByUser(userId: string): Task[]{
    return tasks.filter(task => task.userId === userId)
}

function deleteTaskById(id: string, userId: string): boolean {
    const index = tasks.findIndex(task => task.id === id && task.userId === userId)
    if (index === -1) return false
        tasks.splice(index, 1)
    return true
}

function updateTask(id: string, updates: Partial<Task>, userId: string): Task | null {
    const index = tasks.findIndex(task => task.id === id && task.userId === userId)
    if (index === -1) return null
    const task = tasks[index]
    if (updates.title !== undefined) {
        if (String(updates.title).trim()) {
            task.title = String(updates.title).trim()
        }
    }
    if (updates.completed !== undefined) {
        task.completed = Boolean(updates.completed)
    }
    return task
}
export { tasks, addTask, getTasksByUser, deleteTaskById, updateTask }