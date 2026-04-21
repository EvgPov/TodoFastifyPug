import bcrypt from "bcrypt";
import pool from '../db.ts'

async function registerUser(username: string, password: string):Promise<void> {
  const client = await pool.connect()

  try {
    // проверяем существования пользователя
    const existing = await client.query(`
      SELECT id
      FROM public.users
      WHERE username = $1`,
    [username.toLowerCase()])

    if (existing.rows.length > 0) {
      throw new Error('Пользователь с таким именем уже существует')
    }
    // хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10)
    // добавляем нового пользователя
    await client.query(`
      INSERT INTO public.users (username, password) VALUES ($1, $2)`,
    [username.toLowerCase(), hashedPassword])
  } finally {
    client.release()
  }
}

async function loginUser(username: string, password: string): Promise<number | null> {
  const client = await pool.connect()
  // получаем пользователя по имени
  try {
    const result = await client.query(
      `SELECT id, username, password
       FROM public.users
       WHERE username = $1`,
       [username.toLowerCase()]
    )

    const user = result.rows[0]
    if (!user) return null
    // если пользователь зарегистрирован, то проверяем пароль
    const match = await bcrypt.compare(password, user.password)
    if (!match) return null
    // возвращаем ID пользовател
    return user.id
  } finally {
    client.release()
  }
}

export { registerUser, loginUser}