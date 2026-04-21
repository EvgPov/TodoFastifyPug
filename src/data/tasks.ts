import type { Task } from "../types/types.ts";
import pool from '../db.ts'

// создание задачи
async function addTask(title: string, userId: number): Promise<Task> {
    const client = await pool.connect()

    try {
        const result = await client.query(
            `INSERT INTO public.tasks (title, completed, user_id)
             VALUES ($1, FALSE, $2)
             RETURNING *`,
             [title.trim(), userId]
        )
        return result.rows[0] as Task
    } catch(error) {
        console.log('Ошибка создания задачи:', error)
        throw error
    } finally {
        client.release()
    }
}

// чтение задач пользователя
async function getTasksByUser(userId: number): Promise<Task[]> {
    const client = await pool.connect()

    try {
        const result = await client.query(`
            SELECT *
            FROM public.tasks
            WHERE user_id = $1
            ORDER BY created_at DESC `,
            [userId])
        return result.rows as Task[]
    } catch(error) {
        console.log('Ошибка получения задач по ID пользователя:', error)
        throw error
    } finally {
        client.release()
    } 
}

// удаление конкретной задачи конкретного пользователя
async function deleteTaskById(id: number, userId: number): Promise<boolean> {
    const client = await pool.connect()
    try {
        const result = await client.query(`
            DELETE
            FROM public.tasks
            WHERE id = $1 AND user_id = $2`,
            [id, userId])
        return (result.rowCount ?? 0) > 0 // true, если удалилась хотя бы одна задача
    } catch(error) {
        console.log('Ошибка удаления задачи:', error)
        throw error
    }finally {
        client.release()
    } 
}
// обновление задачи
async function updateTask(id: number,
                          updates: Partial<Task>,
                          userId: number): Promise<Task | null> {
    const client = await pool.connect()
    
    try {
        //если ничего не пришло на обновление
        if (updates.title === undefined && updates.completed === undefined) {
        return null;
        }

        const result = await client.query(
            `UPDATE public.tasks 
            SET title = COALESCE($1, title),
            completed = COALESCE($2, completed)
            WHERE id = $3 AND user_id = $4
            RETURNING *`,
            [
                updates.title !== undefined ? String(updates.title).trim() : null,
                updates.completed !== undefined ? Boolean(updates.completed) : null,
                id,
                userId
            ]
        )
        return result.rows.length > 0 ? (result.rows[0] as Task) : null
    } catch(error) {
        console.log('Ошибка удаления задачи:', error)
        throw error
    }finally {
        client.release()
    } 
}
export { addTask,
         getTasksByUser,
         deleteTaskById,
         updateTask }